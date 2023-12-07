const TokensModel = require('../models/tokens');
const axios = require('axios');
const BullMQ = require('bullmq');
const util = require('util');
const { gulfCountries, restrictedProducts } = require('../constants');
const {
  SUITEFLEET_BASE_URL,
  SUITEFLEET_CLIENT_ID,
  SHOPIFY_STORE_URL,
  SHOPIFY_ADMIN_API_ACCESS_TOKEN,
  SHOPIFY_API_VERSION,
} = process.env;

const createOrderWorker = new BullMQ.Worker(
  'createOrderQueue',
  async (job) => {
    try {
      let orderData = job.data;

      // console.log(util.inspect(orderData, false, null, true));

      const {
       shipping_address: { country },
        id: cusOrderNumber,
      } = orderData;

      const filteredLineItems = await Promise.all(
        orderData.line_items.map(async (item) => {
          if (restrictedProducts.includes(item.product_id)) {
            console.log(`Product ${item.product_id} is restricted.`);
            orderData.total_price -= item.price;
            return null;
          }
          return item;
        })
      );

      orderData.line_items = filteredLineItems.filter((item) => item !== null);

      if (gulfCountries.includes(country) && orderData.line_items.length > 0) {
        const { accessToken } = await TokensModel.findOne({});
        const CREATE_ORDER_URL = `${SUITEFLEET_BASE_URL}/api/tasks`;

        const createdDate = new Date(orderData.created_at);
        const deliveryDate = new Date(createdDate);
        if (deliveryDate.getHours() > 11) {
          deliveryDate.setDate(createdDate.getDate() + 1);
        }

        // console.log(deliveryDate.toISOString());

        const totalQuantity = orderData.line_items.reduce(
          (acc, item) => acc + item.quantity,
          0
        );

        let data = {
          codAmount:
            orderData.financial_status === 'paid' ? 0 : orderData.total_price,
          codCurrency: 'AED',
	  consignee: {
            location: {
              name: orderData.shipping_address.name,
              addressLine1: orderData.shipping_address.address1,
              addressLine2: orderData.shipping_address?.address2,
              contactPhone: orderData.shipping_address?.phone,
              city: orderData.shipping_address.city,
              zip: orderData.shipping_address?.zip,
              contactEmail: orderData.contact_email,
              stateProvince: orderData.shipping_address.province,
              countryCode: orderData.shipping_address.country_code,
              district: orderData.shipping_address.city,
              latitude: orderData.shipping_address?.latitude,
              longitude: orderData.shipping_address?.longitude,
            },
            name: orderData.shipping_address.name,
          },
          creationSource: 'API',
          customerId: '10',
          customerOrderNumber: orderData.order_number,
          deliverToCustomerOnly: false,
          deliveryDate: deliveryDate,
          deliveryAfterTime: '01:00',
          deliveryBeforeTime: '18:00',
          deliveryType: 'EXPRESS',
          notes: orderData.note,
          referenceNumber: orderData.reference,
          totalDeclaredGrossWeight: Number(orderData.total_weight),
          totalShipmentQuantity: Number(totalQuantity),
          totalShipmentValueAmount: Number(orderData.total_price),
          type: 'DELIVERY',
          volume: Number(orderData.total_weight),
        };

        let config = {
          method: 'post',
          maxBodyLength: Infinity,
          url: CREATE_ORDER_URL,
          headers: {
            clientid: SUITEFLEET_CLIENT_ID,
            'Content-Type': 'application/json',
            Cookie: `Authorization=${accessToken}`,
          },
          data: JSON.stringify(data),
        };

        axios
          .request(config)
          .then((response) => {
            console.log(
              `Order Created with Suitefleet Id:${response.data.id} against Shopify Order Id:${response.data.customerOrderNumber}`
            );

            const { awb: tracking_id } = response.data;
            console.log({ tracking_id });
          })
          .catch(async (error) => {
            console.log(error.message);
          });
      } else {
        if (orderData.line_items.length === 0) {
          console.log(
            `Order has no line items, skipping order creation for Order Id:${orderData.order_number}`
          );
        } else {
          console.log(
            `Order is not from Gulf Countries, skipping order creation for Order Id:${orderData.order_number}`
          );
        }
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

createOrderWorker.on('failed', (job) => {
  console.log(`Job Failed for Order Id:${job.data.id}, error`);

  if (job.attemptsMade === 0) {
    console.log(`Retrying job for Order Id:${job.data.id}`);
    job.retry();
  } else {
    console.log(`Job failed after retry for Order Id:${job.data.id}`);
  }
});

module.exports = {
  createOrderWorker,
};
