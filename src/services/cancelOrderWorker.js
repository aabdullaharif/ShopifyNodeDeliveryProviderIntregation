const TokensModel = require('../models/tokens');
const axios = require('axios');
const BullMQ = require('bullmq');
const {
  SUITEFLEET_BASE_URL,
  SUITEFLEET_CLIENT_ID,
  SUITEFLEET_SHIPFROM_PHONENUMBER,
} = process.env;
const { gulfCountries } = require('../constants');

const cancelOrderWorker = new BullMQ.Worker(
  'cancelOrderQueue',
  async (job) => {
    try {
      const {
        order_number,
        shipping_address: { country },
      } = job.data;

      console.log('Cancel Order Id:', order_number);

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
              return Number(item.customerOrderNumber) === order_number;
            });

            if (foundOrder) {
              const { id } = foundOrder;

              const UPDATE_ORDER_DETAILS = `${SUITEFLEET_BASE_URL}/api/tasks/${id}`;
              let statusConfig = {
                method: 'patch',
                url: UPDATE_ORDER_DETAILS,
                headers: {
                  accept: '*/*',
                  clientid: SUITEFLEET_CLIENT_ID,
                  'Content-Type': 'application/merge-patch+json',
                  Cookie: `Authorization=${accessToken}`,
                },
                data: JSON.stringify({
                  status: 'CANCELED',
                  shipFrom: {
                    contactPhone: SUITEFLEET_SHIPFROM_PHONENUMBER,
                  },
                }),
              };

              axios
                .request(statusConfig)
                .then((response) => {
                  console.log(
                    `Shopify Order Id: ${order_number} has been cancelled against Suitefleet Order Id: ${id}`
                  );
                })
                .catch(async (error) => {
                  console.log(error.message);
                });
            } else {
              console.log('Order not found');
            }
          })
          .catch((error) => {
            console.error('Error:', error);
          });
      } else {
        console.log(
          `Order is not from Gulf Countries, skipping order cancellation for Order Id:${order_number}`
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

module.exports = cancelOrderWorker;
