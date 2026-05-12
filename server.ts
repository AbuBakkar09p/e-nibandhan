import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Parent Verification
  app.post("/verify-parent", (req, res) => {
    const { brn, dob } = req.body;
    
    console.log(`Verification request for BRN: ${brn}, DOB: ${dob}`);

    // Mock verification logic
    // In a real scenario, this would call BDRIS official API or a scraper
    if (brn && brn.length === 17 && dob) {
      const mockResults = [
        { name_bn: 'মোহাম্মদ আব্দুর রাজ্জাক', name_en: 'MOHAMMAD ABDUR RAZZAK' },
        { name_bn: 'মোহাম্মদ হারুনুর রশীদ', name_en: 'MOHAMMAD HARUNUR RASHID' },
        { name_bn: 'আব্দুল করিম', name_en: 'ABDUL KARIM' },
        { name_bn: 'খোরশেদ আলম', name_en: 'KHORSHEED ALAM' },
        { name_bn: 'সেকান্দার আলী', name_en: 'SEKANDAR ALI' },
        { name_bn: 'মোরশেদা বেগম', name_en: 'MORSHEDA BEGUM' },
        { name_bn: 'সুফিয়া খাতুন', name_en: 'SUFIA KHATUN' },
        { name_bn: 'জাহানারা বেগম', name_en: 'JAHANARA BEGUM' },
        { name_bn: 'রোকসানা আক্তার', name_en: 'ROKSANA AKTER' },
        { name_bn: 'রেহানা পারভীন', name_en: 'REHANA PARVIN' }
      ];
      
      const lastDigits = parseInt(brn.slice(-2)) || 0;
      const index = lastDigits % mockResults.length;
      const data = mockResults[index];

      return res.json({
        success: true,
        verified: true,
        data: data
      });
    }

    return res.json({
      success: false,
      verified: false,
      message: 'Invalid information'
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
