const axios = require('axios');
const TokensModel = require('../models/tokens');
const asyncHandler = require('../middlewares/asyncHandler');
const {
  SUITEFLEET_BASE_URL,
  SUITEFLEET_CLIENT_ID,
  SUITEFLEET_USERNAME,
  SUITEFLEET_PASSWORD,
} = process.env;

const refreshAuthToken = asyncHandler(async () => {
  const REFRESH_TOKEN_URL = `${SUITEFLEET_BASE_URL}/api/auth/authenticate?username=${SUITEFLEET_USERNAME}&password=${SUITEFLEET_PASSWORD}`;

  let config = {
    method: 'post',
    url: REFRESH_TOKEN_URL,
    headers: {
      clientid: SUITEFLEET_CLIENT_ID,
    },
  };

  const response = await axios.request(config);
  const { accessToken, refreshToken } = response.data;

  if (!accessToken || !refreshToken) {
    throw new Error('No access token or refresh token');
  }
  const token = await TokensModel.findOne({});
  token.accessToken = accessToken;
  token.refreshToken = refreshToken;
  await token.save();
});

const accessAuthToken = asyncHandler(async () => {
  const tokens = await TokensModel.findOne({});
  const ACCESS_TOKEN_URL = `${SUITEFLEET_BASE_URL}/api/auth/refresh`;

  const refreshToken = tokens.refreshToken;

  let config = {
    method: 'get',
    url: ACCESS_TOKEN_URL,
    headers: {
      clientid: SUITEFLEET_CLIENT_ID,
      Cookie: `refreshToken=${refreshToken}`,
    },
  };

  const response = await axios.request(config);
  const { accessToken } = response.data;

  if (!accessToken || !refreshToken) {
    throw new Error('No access token');
  }

  tokens.accessToken = accessToken;
  await tokens.save();
});

module.exports = {
  refreshAuthToken,
  accessAuthToken,
};
