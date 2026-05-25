require('dotenv').config();
const express = require("express");
const bodyParser = require('body-parser');
const cors = require("cors");
const pool = require("./db");
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '1000mb' }));
app.use(bodyParser.urlencoded({ limit: '1000mb', extended: true }));
app.use(bodyParser.raw({ limit: '1000mb' }));

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
});

app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
});

// Routes
app.get('/', (req, res) => {
  res.send('API is running!');
});

// File upload endpoint with PK_BILD_BILDER return
app.post("/person/bild/ins", async (req, res) => {
    try {
        const { category, description, title, files } = req.body;
        
        if (!files || !files.length) {
            return res.status(400).json({ 
                success: false,
                error: "No files provided in the request"
            });
        }

        const file = files[0];
        const filename = file["name"];
        const fileData = file["data"];

        if (!fileData || !filename) {
            return res.status(400).json({ 
                success: false,
                error: "File data and filename are required"
            });
        }

        // Check file extension
        const fileExtension = filename.split('.').pop().toLowerCase();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'pdf', 'csv', 'tsv', 'xlsx', 'doc', 'docx', 'xml'];
        
        if (!allowedExtensions.includes(fileExtension)) {
            return res.status(400).json({ 
                success: false,
                error: "Invalid file type. Allowed types: " + allowedExtensions.join(', ')
            });
        }

        let binaryData;
        if (fileExtension === 'pdf' || fileExtension === 'csv' || fileExtension === 'tsv' || 
            fileExtension === 'xlsx' || fileExtension === 'doc' || fileExtension === 'docx') {
            /*// For binary files, we expect the data to be sent as base64
            if (!fileData.startsWith('data:')) {
                return res.status(400).json({ 
                    success: false,
                    error: "Binary files must be sent as base64 encoded data URLs"
                });
            }
            const base64Data = fileData.replace(/^data:\w+\/\w+;base64,/, '');*/
            binaryData = fileData;
        } else {
            // For images, handle as before
            const base64Data = fileData.replace(/^data:\w+\/\w+;base64,/, '');
            binaryData = Buffer.from(base64Data, 'base64');
            
            if (Buffer.from(base64Data, 'base64').toString('base64') !== base64Data) {
                return res.status(400).json({ 
                    success: false,
                    error: "Invalid base64 data" 
                });
            }
        }

        const fileSize = binaryData.length;
        if (fileSize > 1024 * 1024 * 1024 * 1024) { // Increased to 10MB for document files
            return res.status(400).json({ 
                success: false,
                error: "File size too large. Maximum size is 10MB" 
            });
        }

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_BILD_BILDER" 
             ("FILECONTENT", "FILENAME", "KLASSIFIKATION_1", "KLASSIFIKATION_2") 
             VALUES ($1::bytea, $2, $3, $4) 
             RETURNING "PK_BILD_BILDER", "FILENAME"`,
            [
                binaryData, 
                filename, 
                category,
                description 
            ]
        );

        if (!result.rows || !result.rows[0]) {
            throw new Error("No rows returned after insert");
        }

        const insertedId = result.rows[0].PK_BILD_BILDER;

        res.status(201).json({ 
            success: true,
            PK_BILD_BILDER: insertedId,
            FILENAME: result.rows[0].FILENAME,
            message: "File uploaded successfully", 
            data: {
                id: insertedId,
                filename: filename,
                size: fileSize,
                category: category,
                description: description,
                fileType: fileExtension
            }
        });

    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ 
            success: false,
            error: "Failed to insert data",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.post("/document/add_bild_rel", async (req, res) => {
    try {
        const {fk_inp_belege_all, fk_bild_bilder } = req.body;

        // Validate required field
        if (!fk_inp_belege_all) {
            return res.status(400).json({
                error: "FK_INP_BELEGE_ALL is required",
                received: req.body
            });
        }

 

        // Database operation to insert document
        const result = await pool.query(
            `  insert into "COMPANY"."T_REL_INP_INP_BELEGE_ALL_BILD_BILDER" ( "FK_INP_BELEGE_ALL", "FK_BILD_BILDER")
select  		 		 	  	  	 	 	 	 	 	 	 	 	  	$1,$2`,
            [ fk_inp_belege_all, fk_bild_bilder]  // Now using both parameters
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "No input available",
                details: `No record with FK_INP_BELEGE_ALL = ${fk_inp_belege_all}`
            });
        }

        // Return just the primary key
        res.status(201).json({
            success: true,
         
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert document",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.post("/person/bild/ins", async (req, res) => {
    try {
        const { category, description, files } = req.body;
        if (!files || !files.length) {
            return res.status(400).json({ success: false, error: "No files" });
        }

        const file = files[0];
        const filename = file["name"];
        let fileData = file["data"];

        // Remove data URL prefix (if present)
        const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
        
        // Always convert to binary buffer
        const binaryData = Buffer.from(base64Data, 'base64');

        // Optional: validate file size
        if (binaryData.length > 10 * 1024 * 1024) {
            return res.status(400).json({ success: false, error: "File too large (max 10MB)" });
        }

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_BILD_BILDER" 
             ("FILECONTENT", "FILENAME", "KLASSIFIKATION_1", "KLASSIFIKATION_2") 
             VALUES ($1::bytea, $2, $3, $4) 
             RETURNING "PK_BILD_BILDER"`,
            [binaryData, filename, category, description]
        );

        res.status(201).json({ 
            success: true, 
            PK_BILD_BILDER: result.rows[0].PK_BILD_BILDER 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// Image retrieval endpoint with caching - updated to handle all file types
app.get("/accounts/bild/1/1/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const cacheDir = path.join(__dirname, 'temp_cache');
        
        if (!id || !/^\d+$/.test(id)) {
            return res.status(400).json({ 
                error: "Invalid account ID",
                details: "ID must be a positive integer"
            });
        }

        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        const cachePath = path.join(cacheDir, `image_${id}.cache`);

        if (fs.existsSync(cachePath)) {
            try {
                const cachedData = JSON.parse(fs.readFileSync(cachePath));
                const { FILECONTENT, FILENAME, lastUpdated } = cachedData;
                
                if (Date.now() - lastUpdated < 3600000) {
                    const contentType = getContentType(FILENAME);
                    res.setHeader('Content-Type', contentType);
                    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(FILENAME)}"`);
                    return res.send(Buffer.from(FILECONTENT));
                }
            } catch (cacheError) {
                console.error("Cache read error:", cacheError);
            }
        }

        const result = await pool.query(
            `SELECT "FILECONTENT", "FILENAME"
             FROM "COMPANY"."T_BILD_BILDER" 
             WHERE "PK_BILD_BILDER" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "File not found",
                details: `No file found with ID ${id}`
            });
        }

        const { FILECONTENT, FILENAME } = result.rows[0];
        const fileBuffer = Buffer.isBuffer(FILECONTENT) ? FILECONTENT : Buffer.from(FILECONTENT);

        try {
            const cacheData = {
                FILECONTENT: Array.from(fileBuffer),
                FILENAME,
                lastUpdated: Date.now()
            };
            fs.writeFileSync(cachePath, JSON.stringify(cacheData));
        } catch (cacheError) {
            console.error("Cache write error:", cacheError);
        }

        const contentType = getContentType(FILENAME);
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(FILENAME)}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600');

        res.send(fileBuffer);

    } catch (error) {
        console.error("File retrieval error:", error);
        res.status(500).json({ 
            error: "File retrieval failed",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Updated helper function for content type
function getContentType(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    const typeMap = {
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp',
        
        // Documents
        'pdf': 'application/pdf',
        'csv': 'text/csv',
        'tsv': 'text/tab-separated-values',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

 	// XML
        'xml': 'application/xml'
    };
    return typeMap[extension] || 'application/octet-stream';
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});