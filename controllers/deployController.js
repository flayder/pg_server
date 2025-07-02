const fs = require("fs-extra");
const path = require("path");
const unzipper = require("unzipper");
const { exec } = require("child_process");

const FRONTEND_PATH = "/var/www/porngamestown.com/html"; // путь до .output
const FRONTEND_PATH_DELETE = "/var/www/porngamestown.com/html/.output"; // путь до .output
const TEMP_PATH = path.join(__dirname, "../tmp/upload.zip"); // временный архив
const EXTRACT_PATH = path.join(__dirname, "../tmp/extracted"); // временная папка

// 🔥 Очистка папки .output
exports.clearOutput = async (req, res) => {
  try {
    await fs.remove(FRONTEND_PATH_DELETE);
    res.status(200).json({ message: "Папка .output удалена" });
  } catch (error) {
    console.error("Ошибка при очистке .output:", error);
    res.status(500).json({ message: "Ошибка очистки .output" });
  }
};

// 🔥 Загрузка и распаковка нового билда
exports.uploadFrontend = async (req, res) => {
  try {
    if (!req.files || !req.files.zip) {
      return res.status(400).json({ message: "ZIP-файл не найден" });
    }

    const zip = req.files.zip;
    const tempPath = path.join(__dirname, "../tmp/upload.zip");

    // Сохраняем архив во временную папку
    await zip.mv(tempPath);

    // Удаляем старую .output
    await fs.remove(FRONTEND_PATH);
    //await fs.ensureDir(FRONTEND_PATH);

    // Распаковываем архив
    await fs.createReadStream(tempPath).pipe(unzipper.Extract({ path: FRONTEND_PATH }));

    // Удаляем временный zip
    await fs.remove(tempPath);

    res.status(200).json({ message: "Фронтенд обновлён!" });

  } catch (error) {
    console.error("Ошибка загрузки фронта:", error);
    res.status(500).json({ message: "Ошибка загрузки фронта" });
  }
};

// 🔥 Перезапуск фронта через PM2
exports.restartFrontend = async (req, res) => {
  exec("pm2 restart myapp", (err, stdout, stderr) => {
    if (err) {
      console.error("Ошибка при перезапуске фронта:", err);
      return res.status(500).json({ message: "Ошибка перезапуска фронта" });
    }
    res.status(200).json({ message: "Фронтенд перезапущен!" });
  });
};
