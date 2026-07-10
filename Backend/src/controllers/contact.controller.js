const contactService = require('../services/contact.service');
const asyncHandler = require('../utils/asyncHandler');

const submit = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;
  const result = await contactService.sendContactMessage({ name, email, message });

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = { submit };
