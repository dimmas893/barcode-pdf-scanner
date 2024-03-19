import('node-fetch').then(({ default: fetch }) => {
  const express = require('express');
  const { fromPath } = require('pdf2pic');
  const { PNG } = require('pngjs');
  const jsQR = require('jsqr');
  const multer = require('multer');
  const { body, validationResult } = require('express-validator');
  const xml2js = require('xml2js');
  const cors = require('cors');

  const app = express();
  const port = 3000;
  app.use(cors());
  // Multer setup to handle file uploads
  const upload = multer({ dest: 'uploads/' });
  
  // POST endpoint to handle file upload with validation
  app.post('/upload', upload.single('pdf'),
    // Validation middleware
    [
      body('pdf').custom((value, { req }) => {
        if (!req.file) {
          throw new Error('No file uploaded');
        }
        return true;
      })
    ],
    async (req, res) => {
      try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
  
        const pdfFilePath = req.file.path;
  
        const pdf2picOptions = {
          quality: 100,
          density: 300,
          format: 'png',
          width: 2000,
          height: 2000,
        };
  
        const base64Response = await fromPath(pdfFilePath, pdf2picOptions)(1, true);
        const dataUri = base64Response?.base64;
  
        // Rest of your code for processing the PDF and extracting QR code
        const buffer = Buffer.from(dataUri, 'base64');
        const png = PNG.sync.read(buffer);
  
        const code = jsQR(Uint8ClampedArray.from(png.data), png.width, png.height);
        const qrCodeText = code?.data;
  
        // If QR code text is present
        if (qrCodeText) {
          // Assuming qrCodeText is the URL to fetch the XML data
          // You can replace this with your own logic to fetch XML data
          const xmlUrl = qrCodeText;
  
          // Fetch XML data
          const xmlData = await fetch(xmlUrl).then(res => res.text());
  
          // Convert XML to JSON
          const parser = new xml2js.Parser();
          parser.parseString(xmlData, (err, result) => {
            if (err) {
              res.status(500).json({ error: 'Error parsing XML' });
            } else {
              res.status(200).json(result);
            }
          });
        } else {
          res.status(404).json({ error: 'QR Code not found on the first page of the PDF' });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  );
  
  // Start the server
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
  
  }).catch(err => console.error('Error importing node-fetch:', err));