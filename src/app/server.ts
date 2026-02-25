import express from 'express';
import bodyParser from 'body-parser';
import billingApi from './api/billing.api';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use('/api', billingApi);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
