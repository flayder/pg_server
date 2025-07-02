const axios = require("axios");

exports.sendContactMessage = async (req, res) => {
  const { email, message, captcha } = req.body;

  if (!email || !message || !captcha) {
    return res.status(400).json({ message: "Email, message and captcha required" });
  }

  try {
    // Проверка через hCaptcha API
    const verifyRes = await axios.post(
      "https://hcaptcha.com/siteverify",
      null,
      {
        params: {
          secret: process.env.HCAPTCHA_SECRET_KEY,
          response: captcha,
        },
      }
    );

    if (!verifyRes.data.success) {
      return res.status(403).json({ message: "hCaptcha verification failed" });
    }

    // TODO: Сохранить сообщение или отправить email
    return res.status(200).json({ message: "Message received successfully" });

  } catch (error) {
    console.error("hCaptcha error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
