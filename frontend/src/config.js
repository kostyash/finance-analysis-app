const config = {
  apiGateway: {
    URL: process.env.REACT_APP_API_URL || '',
  },
  cloudfront: {
    URL: process.env.REACT_APP_CLOUDFRONT_URL || '',
  },
  environment: process.env.NODE_ENV,
};

export default config;
