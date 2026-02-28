import express from 'express';
import bodyParser from 'body-parser';

import billingApi from './api/billing.api';
import medicineUploadApi from './api/medicine-upload.api';
import resetPasswordRoute from './api/reset-password.route';

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use('/api', billingApi);
app.use('/api/medicine', medicineUploadApi);
app.use('/api', resetPasswordRoute);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
