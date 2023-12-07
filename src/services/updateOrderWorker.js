const TokensModel = require('../models/tokens');
const axios = require('axios');
const BullMQ = require('bullmq');
const { gulfCountries } = require('../constants');
const {
  SUITEFLEET_BASE_URL,
  SUITEFLEET_CLIENT_ID,
  SUITEFLEET_SHIPFROM_PHONENUMBER,
} = process.env;

const updateOrderWorker = new BullMQ.Worker(
  'updateOrderQueue',
  async (job) => {
    try {
      const orderData = job.data;
      console.log('Update:', orderData.id);

      const {
        billing_address: { country },
      } = orderData;

      if (gulfCountries.includes(country)) {
        const { accessToken } = await TokensModel.findOne({});
        const GET_ALL_ORDERS = `${SUITEFLEET_BASE_URL}/api/tasks`;

        async function fetchAllOrders() {
          const allOrders = [];
          let page = 0;

          while (true) {
            const config = {
              method: 'get',
              url: GET_ALL_ORDERS,
              headers: {
                clientid: SUITEFLEET_CLIENT_ID,
                'Content-Type': 'application/json',
                Cookie: `Authorization=${accessToken}`,
              },
              params: { page },
            };

            try {
              const response = await axios.request(config);
              const ordersOnPage = response.data.content;
              allOrders.push(...ordersOnPage);
              if (response.data.last) {
                break;
              }
              page++;
            } catch (error) {
              console.error('Error fetching orders:', error);
              break;
            }
          }
          return allOrders;
        }

        fetchAllOrders()
          .then((allOrders) => {
            const foundOrder = allOrders.find((item) => {
              return Number(item.customerOrderNumber) === orderData.id;
            });

            const totalQuantity = orderData.line_items.reduce(
              (acc, item) => acc + item.quantity,
              0
            );

            if (foundOrder) {
              const { totalShipmentQuantity } = foundOrder;
              if (totalQuantity !== totalShipmentQuantity) {
                const { id } = foundOrder;

                const UPDATE_ORDER_DETAILS = `${SUITEFLEET_BASE_URL}/api/tasks/${id}`;

                let updatedData = {
                  codAmount:
                    orderData.financial_status === 'paid'
                      ? 0
                      : orderData.total_price,
                  consignee: {
                    location: {
                      addressLine1: orderData.shipping_address.address1,
                      city: orderData.shipping_address.city,
                      contactEmail: orderData.contact_email,
                      contactPhone: orderData.shipping_address?.phone,
                      countryCode: orderData.shipping_address.country_code,
                      name: orderData.shipping_address.first_name,
                      stateProvince: orderData.shipping_address.province,
                      zip: orderData.shipping_address.zip,
                      district: orderData.shipping_address.city,
                    },
                    name: orderData.shipping_address.first_name,
                  },
                  notes: orderData.note,
                  totalDeclaredGrossWeight: Number(orderData.total_weight),
                  totalShipmentQuantity: Number(totalQuantity),
                  totalShipmentValueAmount: Number(orderData.total_price),
                  volume: Number(orderData.total_weight),
                  shipFrom: {
                    contactPhone: SUITEFLEET_SHIPFROM_PHONENUMBER,
                  },
                };

                let statusConfig = {
                  method: 'patch',
                  url: UPDATE_ORDER_DETAILS,
                  headers: {
                    accept: '*/*',
                    clientid: SUITEFLEET_CLIENT_ID,
                    'Content-Type': 'application/merge-patch+json',
                    Cookie: `Authorization=${accessToken}`,
                  },
                  data: JSON.stringify(updatedData),
                };

                axios
                  .request(statusConfig)
                  .then((response) => {
                    console.log(
                      `Shopify Order Id: ${response.data.customerOrderNumber} has been updated against Suitefleet Order Id: ${id}`
                    );
                  })
                  .catch(async (error) => {
                    console.log(error.message);
                  });
              } else {
                console.log('No need to update');
              }
            } else {
              console.log('Order not found to Update');
            }
          })
          .catch((error) => {
            console.error('Error:', error);
          });
      } else {
        console.log(
          `Order is not from Gulf Countries, skipping order updation for Order Id:${orderData.id}`
        );
      }
    } catch (error) {
      console.error('Error processing job:', error);
    }
  },
  {
    connection: {
      host: 'localhost',
      port: 6379,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  }
);

updateOrderWorker.on('failed', (job) => {
  console.log(`Job Failed for Order Id:${job.data.id}, error`);

  if (job.attemptsMade === 0) {
    console.log(`Retrying job for Order Id:${job.data.id}`);
    job.retry();
  } else {
    console.log(`Job failed after retry for Order Id:${job.data.id}`);
  }
});

module.exports = {
  updateOrderWorker,
};
