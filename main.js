const express = require("express");
const bodyParser = require('body-parser');
const fs = require("fs");
const path = require("path");
const uuid = require("uuid");

const app = express();
const server = require('http').createServer(app); // ← clave: pasa app al servidor

// Configurar límites altos para imágenes grandes
app.use(bodyParser.json({ limit: "500mb" }));
app.use(bodyParser.urlencoded({ limit: "500mb", extended: true }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));
app.use(express.static(__dirname + "/views"));
app.use(express.static("static"));

const port = process.env.PORT || 8081;

// Socket.io ahora correctamente integrado con Express
const io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 5e7
});

io.on('connection', client => {
  console.log("Usuario conectado::", client.id);

  // Recibir las imágenes en binario
  client.on('imageProcess', async (arrayBuffers) => {
    console.log("Llegaron en binario:", arrayBuffers.length, "imágenes");

    const dirImagenes = path.join(__dirname, 'imagenes_guardadas');
    if (!fs.existsSync(dirImagenes)) {
      fs.mkdirSync(dirImagenes, { recursive: true });
      console.log("Directorio creado:", dirImagenes);
    }

    try {
      for (let i = 0; i < arrayBuffers.length; i++) {
        const buffer = Buffer.from(arrayBuffers[i]);
        const imageName = `photo_${uuid.v4()}_${i}.png`;
        const savePath = path.join(dirImagenes, imageName);

        fs.writeFileSync(savePath, buffer);
        console.log("Imagen guardada en", savePath);
      }
      client.emit('responseImage', { code: 0, message: "Imágenes guardadas con éxito." });
    } catch (error) {
      console.error("Error al guardar imágenes:", error);
      client.emit('responseImage', { code: 500, message: "Error al guardar las imágenes." });
    }
  });


  // Detectar desconexión
  client.on('disconnect', () => {
    console.log("Usuario desconectado", client.id);
  });
});


// Función para guardar imagen
async function saveImageToFile(dataUrl, index) {
  let base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  let buffer = Buffer.from(base64Data, 'base64');

  let imageName = `photo_${uuid.v4()}_${index}.png`;
  let savePath = path.join(__dirname, 'imagenes_guardadas', imageName);

  fs.writeFileSync(savePath, buffer);
  console.log("Se guardó la imagen en", savePath);

  return savePath;
}

// Servidor escuchando en puerto
server.listen(port, () => { console.log("listening on ", port) });
