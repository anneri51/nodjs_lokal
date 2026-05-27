require('dotenv').config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const bodyParser = require('body-parser');
const taskRepo = require("./repositories/taskRepository");
const Joi = require('joi');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configure bodyParser with appropriate limits
app.use(bodyParser.json({ limit: '1000mb' }));
app.use(bodyParser.urlencoded({ limit: '1000mb', extended: true }));
app.use(bodyParser.raw({ limit: '1000mb' }));





app.use((req, res, next)=>{
    console.log(req.method, req.url, req.body);
    next();
})

app.get('/', (req, res) => {
  res.send('API is running!');
});
// Enhanced error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
});

const fs = require('fs');
const path = require('path');

const morgan = require("morgan");
app.use(morgan("dev"));

/**
 * @api {get} /accounts Get All Bank Accounts with Statements
 * @apiName GetAccounts
 * @apiGroup Accounts
 * @apiVersion 1.0.0
 * 
 * @apiDescription Retrieves all bank accounts with their associated statements from the COMPANY.V_KTO_KONTO_AUSZUG view.
 * Returns comprehensive account information including holder details, account details, and statement information.
 * Results are sorted by year (descending), holder name, IBAN, account type, and month (descending).
 * 
 * @apiSuccess {Object[]} accounts               Array of account objects
 * @apiSuccess {Number}   accounts.holder_id     Account holder ID (FK_KON_OWNER)
 * @apiSuccess {String}   accounts.holder_name   Formatted holder name "Lastname, Firstname"
 * @apiSuccess {Number}   accounts.account_id    Bank account primary key (PK_KTO_BANKKONTO)
 * @apiSuccess {String}   accounts.account_name  IBAN number
 * @apiSuccess {String}   accounts.account_number Bank name
 * @apiSuccess {String}   accounts.account_type  Account type description (BEZ)
 * @apiSuccess {Number}   accounts.year_id       Year of statement (JAHR)
 * @apiSuccess {Number}   accounts.statement_id  Statement primary key (PK_KTO_KONTO_AUSZUG)
 * @apiSuccess {Number}   accounts.mt            Month of statement (MONAT)
 * @apiSuccess {Date}     accounts.statement_date Statement start date (ANFANGSDATUM)
 * @apiSuccess {String}   accounts.statement_name Bank name (repeated from account_number)
 * @apiSuccess {Number}   accounts.FINAL_CNT     Final transaction count
 * @apiSuccess {Number}   accounts.FINAL_AMOUNT  Final amount
 * @apiSuccess {Number}   accounts.ANFANGSBETRAG Starting balance
 * @apiSuccess {Number}   accounts.ENDBETRAG     Ending balance
 * @apiSuccess {Number}   accounts.FK_KTO_KONTO_AUSZUG Foreign key reference
 * 
 * @apiError (500) ServerError Database operation failed
 * 
 * @apiExample {curl} Example usage:
 *   curl -X GET http://localhost:5000/accounts
 * 
 * @apiSampleRequest http://localhost:5000/accounts
 */

// Helper function to get current timestamp in ISO format
// Get current Unix timestamp (seconds since 1970)
function getCurrentUnixTimestamp() {
    return Math.floor(Date.now() / 1000);
}

// Convert date string to Unix timestamp
function dateToUnixTimestamp(dateString) {
    if (!dateString) return null;
    return Math.floor(new Date(dateString).getTime() / 1000);
}
function formatDateForDB(dateString) {
    if (!dateString) return null;
    // PostgreSQL accepts YYYY-MM-DD format for DATE columns
    return dateString;
}

// Simple mapBodyToColumns function
function mapBodyToColumns(body) {
    return {
        // Numeric fields
        FK_LEHR_EINSENDEAUFGABE_LEHRER: body.FK_LEHR_EINSENDEAUFGABE_LEHRER ? parseInt(body.FK_LEHR_EINSENDEAUFGABE_LEHRER) : null,
        FK_MDT_MANDANT: body.FK_MDT_MANDANT ? parseInt(body.FK_MDT_MANDANT) : null,
        FK_STD_BEW_BEWERTUNGSTYP: body.FK_STD_BEW_BEWERTUNGSTYP ? parseInt(body.FK_STD_BEW_BEWERTUNGSTYP) : null,
        FK_KON_PERSON_SCHUELER: body.FK_KON_PERSON_SCHUELER ? parseInt(body.FK_KON_PERSON_SCHUELER) : null,
        
        // Float fields
        INHALT_WERT: body.INHALT_WERT ? parseFloat(body.INHALT_WERT) : null,
        KORREKTHEIT_WERT: body.KORREKTHEIT_WERT ? parseFloat(body.KORREKTHEIT_WERT) : null,
        VERFUEGBARE_SPRACHLICHE_MITTEL_WERT: body.VERFUEGBARE_SPRACHLICHE_MITTEL_WERT ? parseFloat(body.VERFUEGBARE_SPRACHLICHE_MITTEL_WERT) : null,
    GESAMTEINDRUCK_WERT: body.GESAMTEINDRUCK_WERT ? parseFloat(body.GESAMTEINDRUCK_WERT) : null,
        
        // String fields
        GESAMTURTEIL: body.GESAMTURTEIL || null,
        COMM: body.COMM || null,
        STAERKEN_UND_POSITIVE_ASPEKTE: body.STAERKEN_UND_POSITIVE_ASPEKTE || null,
        VERBESSERUNGSPOTENTIAL: body.VERBESSERUNGSPOTENTIAL || null,
        EMPFEHLUNG_NAECHSTE_SCHRITTE: body.EMPFEHLUNG_NAECHSTE_SCHRITTE || null,
        INHALT_SKALA: body.INHALT_SKALA || null,
        INHALT_TEXT: body.INHALT_TEXT || null,
        KORREKTHEIT_SKALA: body.KORREKTHEIT_SKALA || null,
        KORREKTHEIT_TEXT: body.KORREKTHEIT_TEXT || null,
        VERFUEGBARE_SPRACHLICHE_MITTEL_SKALA: body.VERFUEGBARE_SPRACHLICHE_MITTEL_SKALA || null,
        VERFUEGBARE_SPRACHLICHE_MITTEL_TEXT: body.VERFUEGBARE_SPRACHLICHE_MITTEL_TEXT || null,
        GESAMTEINDRUCK_SKALA: body.GESAMTEINDRUCK_SKALA || null,
        GESAMTEINDRUCK_TEXT: body.GESAMTEINDRUCK_TEXT || null,
        
        // Date field - convert to Unix timestamp
        DATUM_BEWERTUNG: dateToUnixTimestamp(body.DATUM_BEWERTUNG)
    };
}

function mapRow(row) { return { pk_rel_org_org_unit_lehr_einsendeaufgabe: row.pk_rel_org_org_unit_lehr_einsendeaufgabe, fk_mdt_mandant: row.fk_mdt_mandant, fk_org_unit: row.fk_org_unit, fk_lehr_einsendeaufgabe: row.fk_lehr_einsendeaufgabe, }; }

function mapRow1(row) { return { pk_lehr_einsendeaufgabe_lehrer: row.pk_lehr_einsendeaufgabe_lehrer, fk_mdt_mandant: row.fk_mdt_mandant, fk_rel_org_org_unit_lehr_einsendeaufgabe: row.fk_rel_org_org_unit_lehr_einsendeaufgabe, fk_kon_person_lehrer: row.fk_kon_person_lehrer, datum_beginn: row.datum_beginn, datum_abschluss: row.datum_abschluss, created_at: row.created_at, fk_std_lehr_ort_typ: row.fk_std_lehr_ort_typ, fk_rel_org_org_unit_person_person_role: row.fk_rel_org_org_unit_person_person_role }; }

const nutritionSchema = Joi.object({
    // Basic drink information
    getraenk: Joi.string().max(255).allow(null, '').optional(),
    getraenk_sub: Joi.string().max(255).allow(null, '').optional(),
    getraenk_groesse: Joi.string().max(100).allow(null, '').optional(),
    fk_std_getraenk_groesse: Joi.number().integer().allow(null).optional(),
    main_getraenk: Joi.string().max(255).allow(null, '').optional(),
    
    // Nutritional values
    groesse_kilojoules_einh_kj: Joi.number().allow(null).optional(),
    kalorien_einh_kcal: Joi.number().allow(null).optional(),
    fett_total_einh_g: Joi.number().allow(null).optional(),
    davon_gesaettigte_fettsaeuren_einh_g: Joi.number().allow(null).optional(),
    kohlenhydrate_total_einh_g: Joi.number().allow(null).optional(),
    davon_zucker_einh_g: Joi.number().allow(null).optional(),
    ballaststoffe_einh_g: Joi.number().allow(null).optional(),
    eiweiss_einh_g: Joi.number().allow(null).optional(),
    salzgeh_alt_einh_g: Joi.number().allow(null).optional(),
    koffein_einh_mg: Joi.number().allow(null).optional(),
    
    // Additional fields
    fk_wh_art_artikel: Joi.number().integer().allow(null).optional(),
    fk_star_starbucks_getraenke_simple: Joi.number().integer().allow(null).optional(),
    Starbucks_Naehrwerte_Getranke: Joi.string().allow(null, '').optional()
});


// CREATE
app.post("/task", async (req, res) => {
  const result = await taskRepo.create(req.body);
  res.json(result);
});

// READ ALL
app.get("/task", async (req, res) => {
  const result = await taskRepo.getAll();
  res.json(result);
});

// READ ONE
app.get("/task/:id", async (req, res) => {
  const result = await taskRepo.getById(req.params.id);
  res.json(result);
});

// UPDATE
app.put("/task/:id", async (req, res) => {
  const result = await taskRepo.update(req.params.id, req.body);
  res.json(result);
});

// DELETE
app.delete("/task/:id", async (req, res) => {
  const result = await taskRepo.remove(req.params.id);
  res.json(result);
});


//1 -  Get all accounts
app.get("/accounts", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        kto.*,
                        kto."FK_KON_OWNER" AS holder_id,
                        kto."OWN1_NACHNAME" || ', ' || kto."OWN1_VORNAME" AS holder_name,
                        kto."PK_KTO_BANKKONTO" AS account_id,
                        kto."JAHR" yr,
                        "IBAN" AS account_name,
                        "BANK" account_number,
                       	"BEZ" AS account_type,
                       	"JAHR" AS year_id,
                        "PK_KTO_KONTO_AUSZUG" AS statement_id,
                         "ANFANGSDATUM" statement_date,
                        "BANK" AS statement_name,
   
    "FINAL_CNT_PAYPAL_GR",
"FINAL_AMOUNT_PAYPAL_GR",
"FINAL_CNT_PAYPAL",
"FINAL_AMOUNT_PAYPAL",
"FINAL_CNT_PAYPAL_ABGSCHL",
"FINAL_AMOUNT_PAYPAL_ABGSCHL",
"KOMMENTAR"

                    FROM 
                        "COMPANY"."V_KTO_KONTO_AUSZUG" kto
                    ORDER BY 
			"JAHR" desc,
  			2,
			"IBAN",
            		 "PK_KTO_BANKKONTO",           
                         "BEZ",
                        
                          
                         "MONAT" DESC;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

//1 -  Get all accounts
app.get("/accounts_paypal/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * from 

"COMPANY"."V_KTO_PAYPAL_CHECK"
WHERE 
                "FK_KTO_KONTO_AUSZUG" = $1`,
            [req.params.id]

        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/REL_VER_VERTRAG_INP_INP_BELEGE_ALL/:ver_id", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * from 

"COMPANY"."T_REL_VER_VERTRAG_INP_INP_BELEGE_ALL" ver
 left join "COMPANY"."T_INP_BELEGE_ALL" inp on ver."FK_INP_INP_BELEGE_ALL" = inp."PK_INP_BELEGE_ALL"
WHERE 
                ver."FK_VER_VERTRAG" = $1`,
            [req.params.ver_id]

        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});



app.get("/relations_buchungen", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                       rel.*,
                   zus."FK_MAIN_KEY",
                  zus."BETRAG",
                  zus."OFFENER_BETRAG",
                  zus."BUCHUNGSTEXT",
             zus."BUCHUNGSTAG",
zus."BUCHT_JAHR",
zus."BUCHT_MONAT",
zus."BUCHT_TAG",

                 inp."BELEGDATUM",
                 inp."BRUTTO_BETRAG",
                 inp."FK_PROJ_PROJEKT",
                 inp."FK_VER_VERTRAG",
                 inp."FK_INV_INVENTAR",
                 inp."BEZEICHNUNG",
                 inp."FK_BAS_KAT_KATEGORIE",
                 inp."BELEGNUMMER"

               
                        FROM "COMPANY"."T_REL_LEX_KTO_BEL"  rel
            LEFT JOIN "COMPANY"."V_KTO_KONTEN_ZUS" zus ON rel."FK_MAIN_KEY" = zus."FK_MAIN_KEY"
            LEFT JOIN "COMPANY"."T_INP_BELEGE_ALL" inp ON rel."FK_INP_BELEGE_ALL" = inp."PK_INP_BELEGE_ALL"
                   `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/schuldnerberatung", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                       full1.*

               
                        FROM "COMPANY"."V_INSO_SCHULDNERBERATUNG_FULL"  full1
                         
                       
                   `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/std", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                       full1.*

               
                        FROM "COMPANY"."T_STD"  full1
                         
                       
                   `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/beleg_zus", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                       full1.*

               
                        FROM "COMPANY"."V_REL_INP_INP_BELEGE_ALL_INP_BELEGE_ALL_KTO"  full1
                         
                       
                   `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.post("/schuldnerberatung-rel/insert", async (req, res) => {
    const {
      
        FK_MDT_MANDANT,
        FK_INSO_SCHULDNERBERATUNG_TEIL,
        FK_INP_BELEGE_ALL,
        CREATED_AT,
        MODIFIED_AT,
        COMM,
        DESCR,
        FK_STD_INSO_STATUS,
        CREATED_BY,
        MODIFIED_BY, 
        FORECAST
    } = req.body;

    try {
        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_REL_INSO_SCHULDNERBERATUNG_TEIL_INP_BELEGE_ALL" (
            
                "FK_MDT_MANDANT",
                "FK_INSO_SCHULDNERBERATUNG_TEIL",
                "FK_INP_BELEGE_ALL",
                "CREATED_AT",
                "MODIFIED_AT",
                "COMM",
                "DESCR",
                "FK_STD_INSO_STATUS",
                "CREATED_BY",
                "MODIFIED_BY",
                "FORECAST"
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *`,
            [
            
                FK_MDT_MANDANT,
                FK_INSO_SCHULDNERBERATUNG_TEIL,
                FK_INP_BELEGE_ALL,
                CREATED_AT,
                MODIFIED_AT,
                COMM,
                DESCR,
                FK_STD_INSO_STATUS,
                CREATED_BY,
                MODIFIED_BY,
                FORECAST
            ]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Insert error:", error.message);
        res.status(500).json({ error: "Insert failed" });
    }
});



app.patch('/api/starbucks/nutrition/update/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Validate only provided fields
        const schema = nutritionSchema.fork(
            Object.keys(nutritionSchema.describe().keys),
            (schema) => schema.optional()
        );
        
        const { error, value } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                details: error.details[0].message
            });
        }
        
        if (Object.keys(value).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }
        
        // Build dynamic UPDATE query for PostgreSQL
        const updates = [];
        const queryParams = [];
        let paramCount = 1;
        
        Object.keys(value).forEach(key => {
            updates.push(`"${key}" = $${paramCount}`);
            queryParams.push(value[key]);
            paramCount++;
        });
        
        // Add the ID as the last parameter
        queryParams.push(id);
        
        const sql = `
            UPDATE "COMPANY"."T_STAR_STARBUCKS_GETRAENKE_NAEHRWERT" 
            SET ${updates.join(', ')}
            WHERE "PK_STAR_STARBUCKS_GETRAENKE_NAEHRWERT" = $${paramCount}
            RETURNING "PK_STAR_STARBUCKS_GETRAENKE_NAEHRWERT"
        `;
        
        const result = await pool.query(sql, queryParams);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: `Record with ID ${id} not found`
            });
        }
        
        res.json({
            success: true,
            message: `Record with ID ${id} updated successfully`,
            updatedFields: updates.length,
            id: id
        });
        
    } catch (err) {
        console.error('Error updating record:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});

// PUT endpoint - full/partial update (alias for PATCH)
app.put('/api/starbucks/nutrition/update/:id', async (req, res) => {
    try {
        const id = req.params.id;
        
        // Validate the request body
        const { error, value } = nutritionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                details: error.details[0].message
            });
        }
        
        if (Object.keys(value).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }
        
        // Build dynamic UPDATE query for PostgreSQL
        const updates = [];
        const queryParams = [];
        let paramCount = 1;
        
        Object.keys(value).forEach(key => {
            updates.push(`"${key}" = $${paramCount}`);
            queryParams.push(value[key]);
            paramCount++;
        });
        
        // Add the ID as the last parameter
        queryParams.push(id);
        
        const sql = `
            UPDATE "COMPANY"."T_STAR_STARBUCKS_GETRAENKE_NAEHRWERT" 
            SET ${updates.join(', ')}
            WHERE "PK_STAR_STARBUCKS_GETRAENKE_NAEHRWERT" = $${paramCount}
            RETURNING "PK_STAR_STARBUCKS_GETRAENKE_NAEHRWERT"
        `;
        
        const result = await pool.query(sql, queryParams);
        
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: `Record with ID ${id} not found`
            });
        }
        
        res.json({
            success: true,
            message: `Record with ID ${id} updated successfully`,
            updatedFields: updates.length,
            id: id
        });
        
    } catch (err) {
        console.error('Error updating record:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: err.message
        });
    }
});
app.put("/schuldnerberatung-rel/update/:id", async (req, res) => {
    const id = req.params.id;

    const {
        FK_MDT_MANDANT,
        FK_INSO_SCHULDNERBERATUNG_TEIL,
        FK_INP_BELEGE_ALL,
        CREATED_AT,
        MODIFIED_AT,
        COMM,
        DESCR,
        FK_STD_INSO_STATUS,
        CREATED_BY,
        MODIFIED_BY,
        FORECAST
    } = req.body;

    try {
        const result = await pool.query(
            `UPDATE "COMPANY"."T_REL_INSO_SCHULDNERBERATUNG_TEIL_INP_BELEGE_ALL"
             SET 
                "FK_MDT_MANDANT" = $1,
                "FK_INSO_SCHULDNERBERATUNG_TEIL" = $2,
                "FK_INP_BELEGE_ALL" = $3,
                "CREATED_AT" = $4,
                "MODIFIED_AT" = $5,
                "COMM" = $6,
                "DESCR" = $7,
                "FK_STD_INSO_STATUS" = $8,
                "CREATED_BY" = $9,
                "MODIFIED_BY" = $10,
                "FORECAST" = $12
             WHERE "PK_REL_INSO_SCHULDNERBERATUNG_TEIL_INP_BELEGE_ALL" = $11
             RETURNING *`,
            [
                FK_MDT_MANDANT,
                FK_INSO_SCHULDNERBERATUNG_TEIL,
                FK_INP_BELEGE_ALL,
                CREATED_AT,
                MODIFIED_AT,
                COMM,
                DESCR,
                FK_STD_INSO_STATUS,
                CREATED_BY,
                MODIFIED_BY,
                id,
                FORECAST
            ]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Update error:", error.message);
        res.status(500).json({ error: "Update failed" });
    }
});

app.delete("/schuldnerberatung-rel/delete/:id", async (req, res) => {
    const id = req.params.id;

    try {
        const result = await pool.query(
            `DELETE FROM "COMPANY"."T_REL_INSO_SCHULDNERBERATUNG_TEIL_INP_BELEGE_ALL"
             WHERE "PK_REL_INSO_SCHULDNERBERATUNG_TEIL_INP_BELEGE_ALL" = $1
             RETURNING *`,
            [id]
        );

        res.json({
            deleted: result.rows[0] || null
        });
    } catch (error) {
        console.error("Delete error:", error.message);
        res.status(500).json({ error: "Delete failed" });
    }
});



app.get("/geschaeftspartner_kontakt_rel_all", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                       *

               
                        FROM "COMPANY"."V_REL_KON_GESCHAEFTSPARTNER_KONTAKT"
                   `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});



  

// GET all termine with related data
app.get("/termine", async (req, res) => {
    try {
        const { page = 1, limit = 50, search, from, to } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT 
                kt."PK_KAL_TERMIN" AS termin_id,
                kt."DATUM" AS datum,
                kt."DESCR" AS description,
                kt."COMM" AS comments,
                kt."CREATED_AT" AS created_at,
                kt."WDH" AS recurrence,
                
                -- Foreign key references with aliases
                --stat."BEZ" AS status_name,
                --typ."BEZ" AS termin_type_name,
                proj."PROJEKT" AS project_name,
                loc."LOCATION" AS location_name,
                gp."GESCHAEFTSPARTNER" AS partner_name,
                mand."MANDANT" AS mandant_name,
                
                -- Additional dates
                kt."DATUM_NEXT" AS next_date,
                kt."DATUM_GEPLANT" AS planned_date,
                kt."DATUM_IST" AS actual_date,
                kt."VALID_FROM" AS valid_from,
                kt."VALID_TO" AS valid_to,
                
                -- Recurrence details
                kt."WDH1" AS recurrence_detail,
                
                -- Foreign keys
                kt."FK_STD_KAL_STATUS" AS status_id,
                kt."FK_STD_KAL_TERMIN_TYP" AS type_id,
                kt."FK_PROJ_PROJEKT" AS project_id,
                kt."FK_LOC_LOCATION" AS location_id,
                kt."FK_KON_GESCHAEFTSPARTNER" AS partner_id,
                kt."FK_MDT_MANDANT" AS mandant_id,
                kt."FK_INV_INVENTAR" AS inventory_id,
                kt."FK_INP_BELEGE_ALL" AS document_id,
                
                -- Created/Modified info
                kt."CREATED_BY" AS created_by,
                kt."MODIFIED_BY" AS modified_by,
                kt."MODIFIED_AT" AS modified_at,
                
                -- Online/Planning fields
                kt."FK_STD_KAL_ONLINE" AS online_status,
                kt."FK_STD_KAL_RELEVANZ" AS relevance_id,
                kt."FK_STD_KAL_PRIORITAET" AS priority_id,
                kt."FK_STD_KAL_ZEITREIHENPOSITION" AS timeline_position
                
            FROM 
                "COMPANY"."T_KAL_TERMINE" kt
            --LEFT JOIN "COMPANY"."T_STD_KAL_STATUS" stat 
             --   ON kt."FK_STD_KAL_STATUS" = stat."PK_STD_KAL_STATUS"
           -- LEFT JOIN "COMPANY"."T_STD_KAL_TERMIN_TYP" typ 
            --    ON kt."FK_STD_KAL_TERMIN_TYP" = typ."PK_STD_KAL_TERMIN_TYP"
            LEFT JOIN "COMPANY"."T_PROJ_PROJEKT" proj 
                ON kt."FK_PROJ_PROJEKT" = proj."PK_PROJ_PROJEKT"
            LEFT JOIN "COMPANY"."T_LOC_LOCATION" loc 
                ON kt."FK_LOC_LOCATION" = loc."PK_LOC_LOCATION"
            LEFT JOIN "COMPANY"."T_KON_GESCHAEFTSPARTNER" gp 
                ON kt."FK_KON_GESCHAEFTSPARTNER" = gp."PK_KON_GESCHAEFTSPARTNER"
            LEFT JOIN "COMPANY"."T_MDT_MANDANT" mand 
                ON kt."FK_MDT_MANDANT" = mand."PK_MDT_MANDANT"
        `;
        
        const conditions = [];
        const params = [];
        let paramCount = 0;
        
        // Add search filter
        if (search) {
            paramCount++;
            conditions.push(`(
                kt."DESCR" ILIKE $${paramCount} OR 
                kt."COMM" ILIKE $${paramCount} 
                --stat."BEZ" ILIKE $${paramCount} OR
                --typ."BEZ" ILIKE $${paramCount}
            )`);
            params.push(`%${search}%`);
        }
        
        // Add date range filter
        if (from && to) {
            paramCount++;
            conditions.push(`kt."DATUM" BETWEEN $${paramCount}`);
            params.push(from);
            paramCount++;
            conditions.push(`$${paramCount}`);
            params.push(to);
        }
        
        // Add WHERE clause if conditions exist
        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }
        
        // Add ORDER BY
        query += `
            ORDER BY 
                kt."DATUM" DESC,
                kt."FK_STD_KAL_PRIORITAET" ASC,
                kt."CREATED_AT" DESC
        `;
        
        // Add pagination
        paramCount++;
        query += ` LIMIT $${paramCount}`;
        params.push(limit);
        
        paramCount++;
        query += ` OFFSET $${paramCount}`;
        params.push(offset);
        
        const result = await pool.query(query, params);
        
        // Get total count for pagination
        let countQuery = `SELECT COUNT(*) FROM "COMPANY"."T_KAL_TERMINE" kt`;
        if (conditions.length > 0) {
            countQuery += ` WHERE ${conditions.slice(0, -2).join(' AND ')}`;
        }
        const countResult = await pool.query(countQuery, params.slice(0, -2));
        
        res.json({
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countResult.rows[0].count),
                totalPages: Math.ceil(countResult.rows[0].count / limit)
            }
        });
        
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch termine",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// GET single termin by ID
app.get("/termine/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                kt.*,
                stat."BEZ" AS status_name,
                typ."BEZ" AS termin_type_name,
                proj."PROJEKT_NAME" AS project_name,
                loc."BEZ" AS location_name,
                gp."NAME1" || ' ' || gp."NAME2" AS partner_full_name,
                mand."BEZ" AS mandant_name,
                land."BEZ" AS country_name,
                ort."BEZ" AS city_name,
                adr."STRASSE" || ' ' || adr."HAUSNUMMER" AS full_address
                
            FROM 
                "COMPANY"."T_KAL_TERMINE" kt
            LEFT JOIN "COMPANY"."T_STD_KAL_STATUS" stat 
                ON kt."FK_STD_KAL_STATUS" = stat."PK_STD_KAL_STATUS"
            LEFT JOIN "COMPANY"."T_STD_KAL_TERMIN_TYP" typ 
                ON kt."FK_STD_KAL_TERMIN_TYP" = typ."PK_STD_KAL_TERMIN_TYP"
            LEFT JOIN "COMPANY"."T_PROJ_PROJEKT" proj 
                ON kt."FK_PROJ_PROJEKT" = proj."PK_PROJ_PROJEKT"
            LEFT JOIN "COMPANY"."T_LOC_LOCATION" loc 
                ON kt."FK_LOC_LOCATION" = loc."PK_LOC_LOCATION"
            LEFT JOIN "COMPANY"."T_KON_GESCHAEFTSPARTNER" gp 
                ON kt."FK_KON_GESCHAEFTSPARTNER" = gp."PK_KON_GESCHAEFTSPARTNER"
            LEFT JOIN "COMPANY"."T_MDT_MANDANT" mand 
                ON kt."FK_MDT_MANDANT" = mand."PK_MDT_MANDANT"
            LEFT JOIN "COMPANY"."T_ADR_LAND" land 
                ON kt."FK_ADR_LAND" = land."PK_ADR_LAND"
            LEFT JOIN "COMPANY"."T_ADR_ORT" ort 
                ON kt."FK_ADR_ORT" = ort."PK_ADR_ORT"
            LEFT JOIN "COMPANY"."T_ADR_ADRESSE" adr 
                ON kt."FK_ADR_ADRESSE_SCHNELL" = adr."PK_ADR_ADRESSE"
                
            WHERE 
                kt."PK_KAL_TERMINE" = $1`,
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "Termin not found" 
            });
        }
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch termin",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// GET termine by date range
app.get("/termine/range/:from/:to", async (req, res) => {
    try {
        const { from, to } = req.params;
        
        const result = await pool.query(
            `SELECT 
                kt."PK_KAL_TERMIN" AS termin_id,
                kt."DATUM" AS datum,
                kt."DESCR" AS description,
                kt."COMM" AS comments,
                stat."BEZ" AS status,
                typ."BEZ" AS type,
                kt."DATUM_GEPLANT" AS planned_date,
                kt."DATUM_IST" AS actual_date,
                loc."BEZ" AS location,
                proj."PROJEKT_NAME" AS project
                
            FROM 
                "COMPANY"."T_KAL_TERMINE" kt
            LEFT JOIN "COMPANY"."T_STD_KAL_STATUS" stat 
                ON kt."FK_STD_KAL_STATUS" = stat."PK_STD_KAL_STATUS"
            LEFT JOIN "COMPANY"."T_STD_KAL_TERMIN_TYP" typ 
                ON kt."FK_STD_KAL_TERMIN_TYP" = typ."PK_STD_KAL_TERMIN_TYP"
            LEFT JOIN "COMPANY"."T_LOC_LOCATION" loc 
                ON kt."FK_LOC_LOCATION" = loc."PK_LOC_LOCATION"
            LEFT JOIN "COMPANY"."T_PROJ_PROJEKT" proj 
                ON kt."FK_PROJ_PROJEKT" = proj."PK_PROJ_PROJEKT"
                
            WHERE 
                kt."DATUM" BETWEEN $1 AND $2
                
            ORDER BY 
                kt."DATUM" ASC,
                kt."FK_STD_KAL_PRIORITAET" ASC`,
            [from, to]
        );
        
        res.json(result.rows);
        
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch termine by date range",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// POST create new termin
app.post("/termine/insert", async (req, res) => {
    try {
        const {
            DATUM, DESCR, COMM, WDH, FK_INV_INVENTAR, FK_INP_BELEGE_ALL,
            FK_PROJ_PROJEKT, FK_PROJ_STUNDENZETTEL, FK_MAIN_KEY, FK_LOC_LOCATION,
            FK_ADR_LAND, FK_ADR_ORT, FK_ADR_PLZ_ORT, FK_ADR_ADRESSE_SCHNELL,
            FK_STD_KAL_STATUS, FK_STD_KAL_TERMIN_TYP, DATUM_NEXT, WDH1,
            FK_STD_STD_VALID, VALID_FROM, VALID_TO, FK_FILE_TERMIN,
            FK_FILE_INP_BELEGE_ALL, FK_BAS_KAL_DATUM, DATUM_GEPLANT,
            DATUM_IST, FK_KON_GESCHAEFTSPARTNER, FK_STD_KAL_TERMIN_ONLINE,
            FK_INT_INTERNETPORTAL_APP, FK_STD_KAL_ONLINE, FK_STD_KAL_RELEVANZ,
            FK_STD_KAL_PRIORITAET, FK_STD_KAL_ONLINE_IST, FK_STD_KAL_ONLINE_GEPLANT,
            FK_STD_KAL_ZEITREIHENPOSITION, FK_MDT_MANDANT, CREATED_BY
        } = req.body;
        
        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_KAL_TERMINE" (
                "DATUM", "DESCR", "COMM", "WDH", "FK_INV_INVENTAR", 
                "FK_INP_BELEGE_ALL", "FK_PROJ_PROJEKT", "FK_PROJ_STUNDENZETTEL", 
                "FK_MAIN_KEY", "FK_LOC_LOCATION", "FK_ADR_LAND", "FK_ADR_ORT", 
                "FK_ADR_PLZ_ORT", "FK_ADR_ADRESSE_SCHNELL", "FK_STD_KAL_STATUS", 
                "FK_STD_KAL_TERMIN_TYP", "DATUM_NEXT", "WDH1", "FK_STD_STD_VALID", 
                "VALID_FROM", "VALID_TO", "FK_FILE_TERMIN", "FK_FILE_INP_BELEGE_ALL", 
                "FK_BAS_KAL_DATUM", "DATUM_GEPLANT", "DATUM_IST", 
                "FK_KON_GESCHAEFTSPARTNER", "FK_STD_KAL_TERMIN_ONLINE", 
                "FK_INT_INTERNETPORTAL_APP", "FK_STD_KAL_ONLINE", "FK_STD_KAL_RELEVANZ", 
                "FK_STD_KAL_PRIORITAET", "FK_STD_KAL_ONLINE_IST", 
                "FK_STD_KAL_ONLINE_GEPLANT", "FK_STD_KAL_ZEITREIHENPOSITION", 
                "FK_MDT_MANDANT", "CREATED_AT", "CREATED_BY"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
                $29, $30, $31, $32, $33, $34, $35, $36, NOW(), $37
            ) RETURNING *`,
            [
                DATUM, DESCR || '', COMM || '', WDH || null, FK_INV_INVENTAR || null,
                FK_INP_BELEGE_ALL || null, FK_PROJ_PROJEKT || null, FK_PROJ_STUNDENZETTEL || null,
                FK_MAIN_KEY || null, FK_LOC_LOCATION || null, FK_ADR_LAND || null,
                FK_ADR_ORT || null, FK_ADR_PLZ_ORT || null, FK_ADR_ADRESSE_SCHNELL || null,
                FK_STD_KAL_STATUS || 1, FK_STD_KAL_TERMIN_TYP || 1, DATUM_NEXT || null,
                WDH1 || null, FK_STD_STD_VALID || null, VALID_FROM || null,
                VALID_TO || null, FK_FILE_TERMIN || null, FK_FILE_INP_BELEGE_ALL || null,
                FK_BAS_KAL_DATUM || null, DATUM_GEPLANT || null, DATUM_IST || null,
                FK_KON_GESCHAEFTSPARTNER || null, FK_STD_KAL_TERMIN_ONLINE || null,
                FK_INT_INTERNETPORTAL_APP || null, FK_STD_KAL_ONLINE || null,
                FK_STD_KAL_RELEVANZ || null, FK_STD_KAL_PRIORITAET || null,
                FK_STD_KAL_ONLINE_IST || null, FK_STD_KAL_ONLINE_GEPLANT || null,
                FK_STD_KAL_ZEITREIHENPOSITION || null, FK_MDT_MANDANT || 1,
                CREATED_BY || 'system'
            ]
        );
        
        res.status(201).json({
            message: "Termin created successfully",
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to create termin",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// PUT update termin
app.put("/termine/update/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updateFields = req.body;
        
        // Build dynamic update query
        const setClauses = [];
        const values = [];
        let paramCount = 1;
        
        // Add MODIFIED_AT and MODIFIED_BY automatically
        setClauses.push(`"MODIFIED_AT" = NOW()`);
        setClauses.push(`"MODIFIED_BY" = $${paramCount}`);
        values.push(updateFields.MODIFIED_BY || 'system');
        paramCount++;
        
        // Add other fields from request body
        for (const [key, value] of Object.entries(updateFields)) {
            if (key !== 'MODIFIED_BY') {
                setClauses.push(`"${key}" = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }
        
        values.push(id); // Add ID for WHERE clause
        
        const result = await pool.query(
            `UPDATE "COMPANY"."T_KAL_TERMINE" 
             SET ${setClauses.join(', ')}
             WHERE "PK_KAL_TERMIN" = $${paramCount}
             RETURNING *`,
            values
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "Termin not found" 
            });
        }
        
        res.json({
            message: "Termin updated successfully",
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to update termin",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// DELETE termin
app.delete("/termine/delete/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM "COMPANY"."T_KAL_TERMINE" 
             WHERE "PK_KAL_TERMIN" = $1 
             RETURNING "PK_KAL_TERMINE", "DESCR"`,
            [req.params.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "Termin not found" 
            });
        }
        
        res.json({
            message: "Termin deleted successfully",
            deleted: result.rows[0]
        });
        
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to delete termin",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// GET today's termine
app.get("/termine/today", async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const result = await pool.query(
            `SELECT 
                kt."PK_KAL_TERMINE" AS termin_id,
                kt."DATUM" AS datum,
                kt."DESCR" AS description,
                kt."COMM" AS comments,
                stat."BEZ" AS status,
                typ."BEZ" AS type,
                loc."BEZ" AS location,
                proj."PROJEKT_NAME" AS project,
                kt."FK_STD_KAL_PRIORITAET" AS priority
                
            FROM 
                "COMPANY"."T_KAL_TERMINE" kt
            LEFT JOIN "COMPANY"."T_STD_KAL_STATUS" stat 
                ON kt."FK_STD_KAL_STATUS" = stat."PK_STD_KAL_STATUS"
            LEFT JOIN "COMPANY"."T_STD_KAL_TERMIN_TYP" typ 
                ON kt."FK_STD_KAL_TERMIN_TYP" = typ."PK_STD_KAL_TERMIN_TYP"
            LEFT JOIN "COMPANY"."T_LOC_LOCATION" loc 
                ON kt."FK_LOC_LOCATION" = loc."PK_LOC_LOCATION"
            LEFT JOIN "COMPANY"."T_PROJ_PROJEKT" proj 
                ON kt."FK_PROJ_PROJEKT" = proj."PK_PROJ_PROJEKT"
                
            WHERE 
                DATE(kt."DATUM") = $1
                
            ORDER BY 
                kt."FK_STD_KAL_PRIORITAET" ASC,
                kt."DATUM" ASC`,
            [today]
        );
        
        res.json(result.rows);
        
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch today's termine",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// GET termine statistics
app.get("/termine/statistics", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                COUNT(*) AS total_termine,
                COUNT(CASE WHEN DATE("DATUM") = CURRENT_DATE THEN 1 END) AS today_count,
                COUNT(CASE WHEN "FK_STD_KAL_STATUS" = 1 THEN 1 END) AS pending_count,
                COUNT(CASE WHEN "FK_STD_KAL_STATUS" = 2 THEN 1 END) AS completed_count,
                COUNT(CASE WHEN "FK_STD_KAL_STATUS" = 3 THEN 1 END) AS cancelled_count,
                MIN("DATUM") AS earliest_date,
                MAX("DATUM") AS latest_date,
                COUNT(DISTINCT "FK_PROJ_PROJEKT") AS unique_projects,
                COUNT(DISTINCT "FK_KON_GESCHAEFTSPARTNER") AS unique_partners
            FROM 
                "COMPANY"."T_KAL_TERMINE"`
        );
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch statistics",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/branches", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
*

                    FROM 
                        "COMPANY"."T_BAS_ORG_BRANCHES" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/rel_inp_belege_all", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                        "COMPANY"."T_REL_INP_INP_BELEGE_ALL_INP_BELEGE_ALL" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/star_starbucks_getraenke", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                        "COMPANY"."T_STAR_STARBUCKS_GETRAENKE" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/star_starbucks_getraenke/full", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                        "COMPANY"."V_STAR_STARBUCKS_GETRAENKE" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/star_starbucks_getraenke_simple", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                        "COMPANY"."T_STAR_STARBUCKS_GETRAENKE_SIMPLE" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/star_starbucks_speisen_1", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                        "COMPANY"."T_STAR_STARBUCKS_SPEISEN_1" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/star_starbucks_speisen_2", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                        "COMPANY"."T_STAR_STARBUCKS_SPEISEN_2" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/star_starbucks_speisen_group", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                        "COMPANY"."T_STAR_STARBUCKS_SPEISEN_GROUP" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/star_starbucks_speisen_12", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                        "COMPANY"."T_STAR_STARBUCKS_SPEISEN_12" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/star_starbucks_speisen_all", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                       "COMPANY"."V_STAR_STARBUCKS_SPEISEN" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/star_starbucks_speisen_22", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                        "COMPANY"."T_STAR_STARBUCKS_SPEISEN_22" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/star_starbucks_getraenke_naehrwert", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                        "COMPANY"."T_STAR_STARBUCKS_GETRAENKE_NAEHRWERT" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/belege_all", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     inp."PK_INP_BELEGE_ALL",

                     inp."BEZEICHNUNG",
                     inp."TITEL",
                     inp."FK_VER_VERTRAG",
                     inp."FK_PROJ_PROJEKT",
                     inp."FK_INV_INVENTAR",
                     inp."BELEGNUMMER",
                     inp."TITEL",
                     inp."FINAL_CNT_ZUGEORD_TRANS",
                     inp."FINAL_CNT_ZUGEORD_BELEGE",
                     inp."FINAL_CNT_ZUGEORD_BILDER",
                     inp."FINAL_CNT_ZUGEORD_BELEGE_POS",
                     inp."FK_KON_PERSON",
                     inp."FK_KON_ORG_UNIT",
                     inp."FK_VER_VERTRAG",
                     inp."FK_LOC_LOCATION",
                     inp."FK_ADR_CITY", 
                     inp."FK_ADR_LAND",
                     inp."BELEGDATUM",
                     inp."BRUTTO_BETRAG",
                     inp."JAHR",
                     inp."FK_BAS_KAT_KATEGORIE",
                     inp."FK_STD_VERW_VERWENDUNGSZWECK",
                     inp."FK_REL_KON_GESCHAEFTSPARTNER_KONTAKT",
                     inp."FK_KON_GESCHAEFTSPARTNER",
                     inp."FK_KON_KONTAKT",
                     inp."DATUM_ALL_OK"

                    FROM 
                        "COMPANY"."T_INP_BELEGE_ALL" inp
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/rel_inp_belege_all1", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                        "COMPANY"."V_REL_INP_BELEGE_DETAIL4" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});



 



app.get("/rel-org-person-role", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
*

                    FROM 
                        "COMPANY"."V_REL_ORG_ORG_UNIT_PERSON_PERSON_ROLE" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/lehr_einsendeaufgabe_org_unit", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                        "COMPANY"."T_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE" rel
                          left join "COMPANY"."T_ORG_UNIT" org on org."PK_ORG_UNIT" = rel."FK_ORG_UNIT"
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/lehr_bewertung_schueler", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                  *

                    FROM 
                        "COMPANY"."T_LEHR_BEWERTUNG_SCHUELER" 
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});




app.get("/kal_termine", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
*

                    FROM 
                        "COMPANY"."T_KAL_TERMINE" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/belege_count", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT count(*) cnt


                    FROM 
                        "COMPANY"."T_INP_BELEGE_ALL" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/bild_klassfikation_aggr", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
*

                    FROM 
                        "COMPANY"."V_BILD_KLASSIFIZIERUNG_AGGR" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/buch", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
*

                    FROM 
                        "COMPANY"."T_MEDIA_BUCH_BUCH" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/gartenverein/grundstueck_eigentuemer", async (req, res) => {
    try {
        const result = await pool.query(
            `select  * from "COMPANY"."V_VERE_VEREIN_DETAIL"       `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/marken", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
*

                    FROM 
                        "COMPANY"."T_BAS_ORG_MARKEN" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/artikel", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
*

                    FROM 
                        "COMPANY"."T_REL_WH_ARTIKEL_ARTIKELNUMMER" relart
                      left join "COMPANY"."T_WH_ART_ARTIKEL" art on art."PK_WH_ART_ARTIKEL" = relart."FK_WH_ART_ARTIKEL"
left join (select * from "COMPANY"."T_STD" where "FK_STD_GROUP"=2)  std on std."STD_VALUE"::double precision = art."FK_BAS_WH_ART_ARTIKELBDLG"
left join "COMPANY"."T_BILD_BILDER" bild on bild."PK_BILD_BILDER" = relart."FK_BILD_BILDER"
left join "COMPANY"."T_BAS_WH_PKG_PACKUNGSTYP" pkg on pkg."PK_BAS_WH_PKG_PACKUNGSTYP" = art."FK_BAS_WH_PKG_PACKUNGSTYP"
left join "COMPANY"."T_REL_WH_ARTIKEL_ARTIKELNUMMER_KATEGORIE" artkat on relart."PK_REL_WH_ARTIKEL_ARTIKELNUMMER" = artkat."FK_WH_ARTIKEL_ARTIKELNUMMER"
left join "COMPANY"."T_BAS_KAT_KATEGORIE" kat on kat."PK_BAS_KAT_KATEGORIE" = artkat."FK_BAS_KAT_KATEGORIE"
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/artikel_typ", async (req, res) => {
    try {
        const result = await pool.query(
            ` 	 
 	 SELECT relart.*,
art1."PK_BAS_WH_ART_ARTIKELTYP" art1_PK_BAS_WH_ART_ARTIKELTYP,
art1."ARTIKELTYP" art1_artikeltyp,
art2."PK_BAS_WH_ART_ARTIKELTYP" art2_PK_BAS_WH_ART_ARTIKELTYP,
art2."ARTIKELTYP" art2_artikeltyp

                    FROM 
                        "COMPANY"."T_REL_WH_ARTIKELTYP_ARTIKELTYP" relart
                      left join "COMPANY"."T_BAS_WH_ART_ARTIKELTYP" art1 on art1."PK_BAS_WH_ART_ARTIKELTYP" = relart."FK_BAS_WH_ART_ARTIKELTYP_MAIN"
    left join "COMPANY"."T_BAS_WH_ART_ARTIKELTYP" art2 on art2."PK_BAS_WH_ART_ARTIKELTYP" = relart."FK_BAS_WH_ART_ARTIKELTYP_SUB"
 	 

                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/person_hierarchy", async (req, res) => {
    try {
        const result = await pool.query(
            `WITH FirstBild AS (
    SELECT 
        rel."FK_KON_PERSON",
        b."FILECONTENT",
        b."FILENAME",
        b."PK_BILD_BILDER",
        ROW_NUMBER() OVER (
            PARTITION BY rel."FK_KON_PERSON"
            ORDER BY b."PK_BILD_BILDER"
        ) AS rn
    FROM 
        "COMPANY"."T_REL_KON_PERSON_BILD" rel
    JOIN 
        "COMPANY"."T_BILD_BILDER" b 
        ON rel."FK_BILD_BILDER" = b."PK_BILD_BILDER"
)
SELECT 
    kto.*,

    --fb."FILECONTENT",
    fb."FILENAME",
    fb."PK_BILD_BILDER",

    --fb1."FILECONTENT" fb1_filecontent,
    fb1."FILENAME" fb1_filename,
    fb1."PK_BILD_BILDER" fb1_pk_bild_bilder
FROM 
    "COMPANY"."V_KON_PERSON_HIERARCHY_DETAILED1" kto

LEFT JOIN 
    FirstBild  fb 
    ON fb."FK_KON_PERSON" = kto."PARENT_ID" AND fb.rn = 1
 LEFT JOIN 
    FirstBild  fb1 
    ON fb1."FK_KON_PERSON" = kto."CHILD_ID" AND fb1.rn = 1
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


/* ============================================================ GET ALL (with optional filters) ============================================================ */ 
app.get('/lehr_einsendeaufgabe_lehrer', async (req, res) => { try { const { fk_mdt_mandant, fk_rel_org_org_unit_lehr_einsendeaufgabe, fk_kon_person_lehrer, fk_std_lehr_ort_typ, fk_rel_org_org_unit_person_person_role } = req.query; const conditions = []; const values = []; function addFilter(field, value) { if (value != null) { values.push(value); conditions.push(`${field} = $${values.length}`); } } addFilter('"FK_MDT_MANDANT"', fk_mdt_mandant); addFilter('"FK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE"', fk_rel_org_org_unit_lehr_einsendeaufgabe); addFilter('"FK_KON_PERSON_LEHRER"', fk_kon_person_lehrer); addFilter('"FK_STD_LEHR_ORT_TYP"', fk_std_lehr_ort_typ); addFilter('"FK_REL_ORG_ORG_UNIT_PERSON_PERSON_ROLE"', fk_rel_org_org_unit_person_person_role); const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''; const sql = ` SELECT "PK_LEHR_EINSENDEAUFGABE_LEHRER", "FK_MDT_MANDANT", "FK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE", "FK_KON_PERSON_LEHRER", "DATUM_BEGINN", "DATUM_ABSCHLUSS", "CREATED_AT", "FK_STD_LEHR_ORT_TYP", "FK_REL_ORG_ORG_UNIT_PERSON_PERSON_ROLE" FROM "COMPANY"."T_LEHR_EINSENDEAUFGABE_LEHRER" ${where} ORDER BY "PK_LEHR_EINSENDEAUFGABE_LEHRER" `; const result = await pool.query(sql, values); res.json(result.rows.map(mapRow)); } catch (err) { console.error('GET error:', err); res.status(500).json({ error: 'internal_error' }); } }); 

/* ============================================================ GET BY ID ============================================================ */ 
app.get('/lehr_einsendeaufgabe_lehrer/:id', async (req, res) => { try { const id = Number(req.params.id); if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' }); const sql = ` SELECT "PK_LEHR_EINSENDEAUFGABE_LEHRER", "FK_MDT_MANDANT", "FK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE", "FK_KON_PERSON_LEHRER", "DATUM_BEGINN", "DATUM_ABSCHLUSS", "CREATED_AT", "FK_STD_LEHR_ORT_TYP", "FK_REL_ORG_ORG_UNIT_PERSON_PERSON_ROLE" FROM "COMPANY"."T_LEHR_EINSENDEAUFGABE_LEHRER" WHERE "PK_LEHR_EINSENDEAUFGABE_LEHRER" = $1 `; const result = await pool.query(sql, [id]); if (result.rowCount === 0) return res.status(404).json({ error: 'not_found' }); res.json(mapRow(result.rows[0])); } catch (err) { console.error('GET by ID error:', err); res.status(500).json({ error: 'internal_error' }); } }); 

/* ============================================================ CREATE ============================================================ */ 
app.post('/lehr_einsendeaufgabe_lehrer/insert', async (req, res) => { try { const { fk_mdt_mandant, fk_rel_org_org_unit_lehr_einsendeaufgabe, fk_kon_person_lehrer, datum_beginn, datum_abschluss, fk_std_lehr_ort_typ, fk_rel_org_org_unit_person_person_role } = req.body || {}; if ( fk_mdt_mandant == null || fk_rel_org_org_unit_lehr_einsendeaufgabe == null || fk_kon_person_lehrer == null ) { return res.status(400).json({ error: 'missing_required_fields' }); } const sql = ` INSERT INTO "COMPANY"."T_LEHR_EINSENDEAUFGABE_LEHRER" ( "FK_MDT_MANDANT", "FK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE", "FK_KON_PERSON_LEHRER", "DATUM_BEGINN", "DATUM_ABSCHLUSS", "CREATED_AT", "FK_STD_LEHR_ORT_TYP", "FK_REL_ORG_ORG_UNIT_PERSON_PERSON_ROLE" ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7) RETURNING "PK_LEHR_EINSENDEAUFGABE_LEHRER", "FK_MDT_MANDANT", "FK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE", "FK_KON_PERSON_LEHRER", "DATUM_BEGINN", "DATUM_ABSCHLUSS", "CREATED_AT", "FK_STD_LEHR_ORT_TYP", "FK_REL_ORG_ORG_UNIT_PERSON_PERSON_ROLE" `; const result = await pool.query(sql, [ fk_mdt_mandant, fk_rel_org_org_unit_lehr_einsendeaufgabe, fk_kon_person_lehrer, datum_beginn, datum_abschluss, fk_std_lehr_ort_typ, fk_rel_org_org_unit_person_person_role ]); res.status(201).json(mapRow(result.rows[0])); } catch (err) { console.error('POST error:', err); if (err.code === '23503') { return res.status(409).json({ error: 'foreign_key_violation' }); } res.status(500).json({ error: 'internal_error' }); } }); 

/* ============================================================ UPDATE ============================================================ */ 
app.put('/lehr_einsendeaufgabe_lehrer/update/:id', async (req, res) => { try { const id = Number(req.params.id); if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' }); const { fk_mdt_mandant, fk_rel_org_org_unit_lehr_einsendeaufgabe, fk_kon_person_lehrer, datum_beginn, datum_abschluss, fk_std_lehr_ort_typ, fk_rel_org_org_unit_person_person_role } = req.body || {}; const sets = []; const values = []; let idx = 1; function addSet(field, value) { if (value != null) { sets.push(`${field} = $${idx++}`); values.push(value); } } addSet('"FK_MDT_MANDANT"', fk_mdt_mandant); addSet('"FK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE"', fk_rel_org_org_unit_lehr_einsendeaufgabe); addSet('"FK_KON_PERSON_LEHRER"', fk_kon_person_lehrer); addSet('"DATUM_BEGINN"', datum_beginn); addSet('"DATUM_ABSCHLUSS"', datum_abschluss); addSet('FK_STD_LEHR_ORT_TYP', fk_std_lehr_ort_typ); addSet('FK_REL_ORG_ORG_UNIT_PERSON_PERSON_ROLE', fk_rel_org_org_unit_person_person_role); if (sets.length === 0) { return res.status(400).json({ error: 'no_fields_to_update' }); } values.push(id); const sql = ` UPDATE "COMPANY"."T_LEHR_EINSENDEAUFGABE_LEHRER" SET ${sets.join(', ')} WHERE "PK_LEHR_EINSENDEAUFGABE_LEHRER" = $${idx} RETURNING "PK_LEHR_EINSENDEAUFGABE_LEHRER", "FK_MDT_MANDANT", "FK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE", "FK_KON_PERSON_LEHRER", "DATUM_BEGINN", "DATUM_ABSCHLUSS", "CREATED_AT", "FK_STD_LEHR_ORT_TYP", "FK_REL_ORG_ORG_UNIT_PERSON_PERSON_ROLE" `; const result = await pool.query(sql, values); if (result.rowCount === 0) return res.status(404).json({ error: 'not_found' }); res.json(mapRow(result.rows[0])); } catch (err) { console.error('PUT error:', err); if (err.code === '23503') { return res.status(409).json({ error: 'foreign_key_violation' }); } res.status(500).json({ error: 'internal_error' }); } }); 

/* ============================================================ DELETE ============================================================ */ 
app.delete('/lehr_einsendeaufgabe_lehrer/delete/:id', async (req, res) => { try { const id = Number(req.params.id); if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid_id' }); const sql = ` DELETE FROM "COMPANY"."T_LEHR_EINSENDEAUFGABE_LEHRER" WHERE "PK_LEHR_EINSENDEAUFGABE_LEHRER" = $1 `; const result = await pool.query(sql, [id]); if (result.rowCount === 0) return res.status(404).json({ error: 'not_found' }); res.status(204).send(); } catch (err) { console.error('DELETE error:', err); res.status(500).json({ error: 'internal_error' }); } }); 



app.get("/products", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
*

                    FROM 
                        "COMPANY"."T_PROD_PRODUCT" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/steuer/steuerjahre", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
*

                    FROM 
                        "COMPANY"."V_STEU_STEUER_JAHR_AUFTEILUNG" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/bankkonten", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
*

                    FROM 
                        "COMPANY"."V_KTO_BANKKONTO" kto
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});






app.get("/imp_lex_2024", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                     *

                    FROM 
                        "COMPANY"."T_IMP_LEX_2024_1" kto
                       left join "COMPANY"."T_REL_LEX_KTO_BEL" relbel on relbel."PK_REL_LEX_KTO_BEL" = kto."FK_REL_LEX_KTO_BEL"
                  `
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/bild_klassfikation", async (req, res) => {
    try {
        const { KLASSIFIKATION_1, KLASSIFIKATION_2, KLASSIFIKATION_3, FILENAME } = req.query;

        const conditions = [];
        const values = [];

        if (KLASSIFIKATION_1) {
            values.push(KLASSIFIKATION_1);
            conditions.push(`"KLASSIFIKATION_1" = $${values.length}`);
        }

        if (KLASSIFIKATION_2) {
            values.push(KLASSIFIKATION_2);
            conditions.push(`"KLASSIFIKATION_2" = $${values.length}`);
        }

        if (KLASSIFIKATION_3) {
            values.push(KLASSIFIKATION_3);
            conditions.push(`"KLASSIFIKATION_3" = $${values.length}`);
        }

        if (FILENAME) {
            values.push(FILENAME);
            conditions.push(`"FILENAME" = $${values.length}`);
        }

        // Build WHERE clause with OR logic
        const whereClause = conditions.length > 0 
            ? `WHERE ${conditions.join(" OR ")}`
            : "";

        const sql = `
            SELECT *
            FROM "COMPANY"."T_BILD_BILDER"
            ${whereClause}
        `;

        const result = await pool.query(sql, values);
        res.json(result.rows);

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});




//1 -  Get all accounts
app.get("/techniker1", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."V_INP_POS6_JSON" ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/kon_geschaeftspartner", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."T_KON_GESCHAEFTSPARTNER" ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

//1 -  Get all accounts
app.get("/post_mail", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."T_POST_BRIEF_EMAIL" ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/rel_bild", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."T_REL_BILD_BILDER" ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/accounts/2/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT rel."PK_REL_LEX_KTO_BEL",
                rel."FK_MAIN_KEY",
                rel."FK_INP_BELEGE_ALL",
                rel."FK_LEX_RELATION",
		rel."LINK_LEXOFFICE_BUCHUNG",
                rel."FLG_LEXOFFICE_BUCHUNG",
		rel."FLG_LEXOFFICE_MIT_BILD",
                zus."BUCHUNGSTEXT",
                zus."BETRAG",
                zus."OFFENER_BETRAG",
                zus."FK_KTO_BANKKONTO",
                zus."FK_KON_OWNER1",
 zus."IBAN",
                zus."OWNER1",
                zus."BUCHT_JAHR",
                zus."TBL",
                '<a href=' || rel."LINK_LEXOFFICE_BUCHUNG" || ' target="_blank" 
   rel="noopener noreferrer"
   class="lexoffice-link">
   ' || rel."LINK_LEXOFFICE_BUCHUNG" || '
</a>' link,

             
                to_char(zus."BUCHUNGSTAG",'DD.MM.YYYY') as "BUCHUNGSTAG",
           
          
            
                zus."FK_KTO_KONTO_AUSZUG",
                inp."PK_INP_BELEGE_ALL",
                inp."BEZEICHNUNG",
                inp."BRUTTO_BETRAG",
                inp."FK_ABL_ORDNER_PAGE",
                inp."BELEGDATUM",
                zus."DATUM_ALL_OK",
                zus."DATUM_ZUORD_KTO_AUSZUG_OK",
                zus."FINAL_CNT_ZUORD_BELEGE"
            FROM "COMPANY"."T_REL_LEX_KTO_BEL" rel
            LEFT JOIN "COMPANY"."V_KTO_KONTEN_ZUS" zus ON rel."FK_MAIN_KEY" = zus."FK_MAIN_KEY"
            LEFT JOIN "COMPANY"."T_INP_BELEGE_ALL" inp ON rel."FK_INP_BELEGE_ALL" = inp."PK_INP_BELEGE_ALL"
             WHERE rel."FK_INP_BELEGE_ALL" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/bas_vorgang/belege/zusammenhang/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT *
            FROM "COMPANY"."V_REL_INP_INP_BELEGE_ALL_BAS_BAS_VORGANG" rel

             WHERE rel."PK_BAS_BAS_VORGANG" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/rel_bild_parameter", async (req, res) => {
    try {
        const {
            FK_INP_BELEGE_ALL,
            FK_BILD_BILDER,
            FK_ABL_ORDNER,
            FK_ABL_ORDNER_PAGE,
            FK_REL_KON_GESCHAEFTSPARTNER_KONTAKT_ORG_MARKE,
            FK_ADR_REGION,
            FK_AHN_FAMILIE,
            FK_INV_INVENTAR,
            FK_KON_PERSON,
            FK_REL_AHN_PERSON_LEBENSPARTNER,
            FK_KTO_KONTO_AUSZUG,
            FK_REL_LEHR_FRAGE_LOESUNG,
            FK_LOC_LOCATION,
            FK_ADR_ADRESSE_SCHNELL,
            FK_REL_ORG_ORG_UNIT_ORG_UNIT_ORG_MARKE,
            FK_MEDIA_BUCH_BUCH,
            FK_POL_ABSTIMMUNGEN,
            FK_VER_VERTRAG,
            FK_WAHL_PARTEI,
            FK_WAHL_STIMM_ZETTEL,
            FK_PROJ_PROJECT,
            EXTERNAL_PROJECT_ID,
            FK_REL_DOC_DOCUMENT_ABL_ORDNER_PAGE,
            DATUM,
            OEFF_VERSANDDATUM,
            OEFF_EINGANGSDATUM,
            FK_DOC_DOCUMENT_CAUSE,
            OEFF_BERICHTSJAHR,
            OEFF_DATUM_KOORDINIERUNG,
            OEFF_BESCHEIDDATUM,
            OEFF_DOKUMENT_ORDNER_ID,
            OEFF_DOKUMENT_ANLASS_ID,
            MAIN_BILD,
            AKTUELL,
            REIHENFOLGE,
            SEITE
        } = req.query;

        // Build dynamic WHERE clause
        const conditions = [];
        const values = [];
        let paramCount = 1;


        if (FK_INP_BELEGE_ALL) {
            conditions.push(`rel."FK_INP_BELEGE_ALL" = $${paramCount}`);
            values.push(FK_INP_BELEGE_ALL);
            paramCount++;
        }
        if (FK_BILD_BILDER) {
            conditions.push(`rel."FK_BILD_BILDER" = $${paramCount}`);
            values.push(FK_BILD_BILDER);
            paramCount++;
        }
        if (FK_ABL_ORDNER) {
            conditions.push(`rel."FK_ABL_ORDNER" = $${paramCount}`);
            values.push(FK_ABL_ORDNER);
            paramCount++;
        }
        if (FK_ABL_ORDNER_PAGE) {
            conditions.push(`rel."FK_ABL_ORDNER_PAGE" = $${paramCount}`);
            values.push(FK_ABL_ORDNER_PAGE);
            paramCount++;
        }
        if (FK_REL_KON_GESCHAEFTSPARTNER_KONTAKT_ORG_MARKE) {
            conditions.push(`rel."FK_REL_KON_GESCHAEFTSPARTNER_KONTAKT_ORG_MARKE" = $${paramCount}`);
            values.push(FK_REL_KON_GESCHAEFTSPARTNER_KONTAKT_ORG_MARKE);
            paramCount++;
        }
        if (FK_ADR_REGION) {
            conditions.push(`rel."FK_ADR_REGION" = $${paramCount}`);
            values.push(FK_ADR_REGION);
            paramCount++;
        }
        if (FK_AHN_FAMILIE) {
            conditions.push(`rel."FK_AHN_FAMILIE" = $${paramCount}`);
            values.push(FK_AHN_FAMILIE);
            paramCount++;
        }
        if (FK_INV_INVENTAR) {
            conditions.push(`rel."FK_INV_INVENTAR" = $${paramCount}`);
            values.push(FK_INV_INVENTAR);
            paramCount++;
        }
        if (FK_KON_PERSON) {
            conditions.push(`rel."FK_KON_PERSON" = $${paramCount}`);
            values.push(FK_KON_PERSON);
            paramCount++;
        }
        if (FK_REL_AHN_PERSON_LEBENSPARTNER) {
            conditions.push(`rel."FK_REL_AHN_PERSON_LEBENSPARTNER" = $${paramCount}`);
            values.push(FK_REL_AHN_PERSON_LEBENSPARTNER);
            paramCount++;
        }
        if (FK_KTO_KONTO_AUSZUG) {
            conditions.push(`rel."FK_KTO_KONTO_AUSZUG" = $${paramCount}`);
            values.push(FK_KTO_KONTO_AUSZUG);
            paramCount++;
        }
        if (FK_REL_LEHR_FRAGE_LOESUNG) {
            conditions.push(`rel."FK_REL_LEHR_FRAGE_LOESUNG" = $${paramCount}`);
            values.push(FK_REL_LEHR_FRAGE_LOESUNG);
            paramCount++;
        }
        if (FK_LOC_LOCATION) {
            conditions.push(`rel."FK_LOC_LOCATION" = $${paramCount}`);
            values.push(FK_LOC_LOCATION);
            paramCount++;
        }
        if (FK_ADR_ADRESSE_SCHNELL) {
            conditions.push(`rel."FK_ADR_ADRESSE_SCHNELL" = $${paramCount}`);
            values.push(FK_ADR_ADRESSE_SCHNELL);
            paramCount++;
        }
        if (FK_REL_ORG_ORG_UNIT_ORG_UNIT_ORG_MARKE) {
            conditions.push(`rel."FK_REL_ORG_ORG_UNIT_ORG_UNIT_ORG_MARKE" = $${paramCount}`);
            values.push(FK_REL_ORG_ORG_UNIT_ORG_UNIT_ORG_MARKE);
            paramCount++;
        }
        if (FK_MEDIA_BUCH_BUCH) {
            conditions.push(`rel."FK_MEDIA_BUCH_BUCH" = $${paramCount}`);
            values.push(FK_MEDIA_BUCH_BUCH);
            paramCount++;
        }
        if (FK_POL_ABSTIMMUNGEN) {
            conditions.push(`rel."FK_POL_ABSTIMMUNGEN" = $${paramCount}`);
            values.push(FK_POL_ABSTIMMUNGEN);
            paramCount++;
        }
        if (FK_VER_VERTRAG) {
            conditions.push(`rel."FK_VER_VERTRAG" = $${paramCount}`);
            values.push(FK_VER_VERTRAG);
            paramCount++;
        }
        if (FK_WAHL_PARTEI) {
            conditions.push(`rel."FK_WAHL_PARTEI" = $${paramCount}`);
            values.push(FK_WAHL_PARTEI);
            paramCount++;
        }
        if (FK_WAHL_STIMM_ZETTEL) {
            conditions.push(`rel."FK_WAHL_STIMM_ZETTEL" = $${paramCount}`);
            values.push(FK_WAHL_STIMM_ZETTEL);
            paramCount++;
        }
        if (FK_PROJ_PROJECT) {
            conditions.push(`rel."FK_PROJ_PROJECT" = $${paramCount}`);
            values.push(FK_PROJ_PROJECT);
            paramCount++;
        }
        if (EXTERNAL_PROJECT_ID) {
            conditions.push(`rel."EXTERNAL_PROJECT_ID" = $${paramCount}`);
            values.push(EXTERNAL_PROJECT_ID);
            paramCount++;
        }
        if (FK_REL_DOC_DOCUMENT_ABL_ORDNER_PAGE) {
            conditions.push(`rel."FK_REL_DOC_DOCUMENT_ABL_ORDNER_PAGE" = $${paramCount}`);
            values.push(FK_REL_DOC_DOCUMENT_ABL_ORDNER_PAGE);
            paramCount++;
        }
        if (DATUM) {
            conditions.push(`rel."DATUM" = $${paramCount}`);
            values.push(DATUM);
            paramCount++;
        }
        if (OEFF_VERSANDDATUM) {
            conditions.push(`rel."OEFF_VERSANDDATUM" = $${paramCount}`);
            values.push(OEFF_VERSANDDATUM);
            paramCount++;
        }
        if (OEFF_EINGANGSDATUM) {
            conditions.push(`rel."OEFF_EINGANGSDATUM" = $${paramCount}`);
            values.push(OEFF_EINGANGSDATUM);
            paramCount++;
        }
        if (FK_DOC_DOCUMENT_CAUSE) {
            conditions.push(`rel."FK_DOC_DOCUMENT_CAUSE" = $${paramCount}`);
            values.push(FK_DOC_DOCUMENT_CAUSE);
            paramCount++;
        }
        if (OEFF_BERICHTSJAHR) {
            conditions.push(`rel."OEFF_BERICHTSJAHR" = $${paramCount}`);
            values.push(OEFF_BERICHTSJAHR);
            paramCount++;
        }
        if (OEFF_DATUM_KOORDINIERUNG) {
            conditions.push(`rel."OEFF_DATUM_KOORDINIERUNG" = $${paramCount}`);
            values.push(OEFF_DATUM_KOORDINIERUNG);
            paramCount++;
        }
        if (OEFF_BESCHEIDDATUM) {
            conditions.push(`rel."OEFF_BESCHEIDDATUM" = $${paramCount}`);
            values.push(OEFF_BESCHEIDDATUM);
            paramCount++;
        }
        if (OEFF_DOKUMENT_ORDNER_ID) {
            conditions.push(`rel."OEFF_DOKUMENT_ORDNER_ID" = $${paramCount}`);
            values.push(OEFF_DOKUMENT_ORDNER_ID);
            paramCount++;
        }
        if (OEFF_DOKUMENT_ANLASS_ID) {
            conditions.push(`rel."OEFF_DOKUMENT_ANLASS_ID" = $${paramCount}`);
            values.push(OEFF_DOKUMENT_ANLASS_ID);
            paramCount++;
        }
        if (MAIN_BILD) {
            conditions.push(`rel."MAIN_BILD" = $${paramCount}`);
            values.push(MAIN_BILD);
            paramCount++;
        }
        if (AKTUELL) {
            conditions.push(`rel."AKTUELL" = $${paramCount}`);
            values.push(AKTUELL);
            paramCount++;
        }
        if (REIHENFOLGE) {
            conditions.push(`rel."REIHENFOLGE" = $${paramCount}`);
            values.push(REIHENFOLGE);
            paramCount++;
        }
    if (SEITE) {
            conditions.push(`rel."SEITE" = $${paramCount}`);
            values.push(SEITE);
            paramCount++;
        }


        // Build the WHERE clause
        const whereClause = conditions.length > 0 
            ? `WHERE ${conditions.join(' AND ')}` 
            : '';

        const query = `
            SELECT 
                *
            FROM "COMPANY"."T_REL_BILD_BILDER" rel
            ${whereClause}
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No records found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch records",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});




// Get single account by ID with proper field mapping
app.get("/projects_wahl_kandidaten/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT kand.*
            FROM "COMPANY"."T_PROJ_PROJEKT" proj
            LEFT JOIN "COMPANY"."T_REL_PROJ_PROJECT_WAHL_KANDIDATEN" rel ON rel."FK_PROJ_PROJECT" = proj."PK_PROJ_PROJEKT"
            LEFT JOIN "COMPANY"."T_WAHL_KANDIDATEN" kand ON rel."FK_WAHL_KANDIDATEN" = kand."PK_WAHL_KANDIDATEN"
             WHERE proj."PK_PROJ_PROJEKT" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/lehr_bewertung_schueler/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT *
            FROM "COMPANY"."T_LEHR_BEWERTUNG_SCHUELER" 
  
             WHERE "PK_LEHR_BEWERTUNG_SCHUELER" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Get single account by ID with proper field mapping
app.get("/rel_konto_auszug_bild/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT *
            FROM "COMPANY"."V_KTO_KONTO_AUSZUG_BILDER" proj
                WHERE proj."PK_BILD_BILDER" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Get single account by ID with proper field mapping
app.get("/buch_inhaltsverzeichnis/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT *
            FROM "COMPANY"."T_MEDIA_BUCH_BUCH_INHALTSVERZEICHNIS" proj
                WHERE proj."FK_MEDIA_BUCH_BUCH" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Get single account by ID with proper field mapping
app.get("/buch_seiten/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT *
            FROM "COMPANY"."T_INP_BELEGE_ALL" proj
                WHERE proj."FK_MEDIA_BUCH_BUCH" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/rel_post_mail", async (req, res) => {
    try {
        const {
            id,
            fk_inp,
            fk_post,
            fk_inv,
            fk_kto
        } = req.query;

        const conditions = [];
        const values = [];

   if (id) {
            conditions.push(`proj."PK_REL_INP_INP_BELEGE_ALL_POST_BRIEF_EMAIL" = $${values.length + 1}`);
            values.push(id);
        }

        if (fk_inp) {
            conditions.push(`proj."FK_INP_BELEGE_ALL" = $${values.length + 1}`);
            values.push(fk_inp);
        }

        if (fk_post) {
            conditions.push(`proj."FK_POST_BRIEF_EMAIL" = $${values.length + 1}`);
            values.push(fk_post);
        }

        if (fk_inv) {
            conditions.push(`proj."FK_INV_INVENTAR" = $${values.length + 1}`);
            values.push(fk_inv);
        }

        if (fk_kto) {
            conditions.push(`proj."FK_KTO_KONTO_AUSZUG_GIR" = $${values.length + 1}`);
            values.push(fk_kto);
        }

        // Build WHERE clause only if needed
        const whereClause = conditions.length > 0
            ? "WHERE " + conditions.join(" AND ")
            : "";

        const sql = `
            SELECT *
            FROM "COMPANY"."T_REL_INP_INP_BELEGE_ALL_POST_BRIEF_EMAIL" proj
                 left join "COMPANY"."T_POST_BRIEF_EMAIL" post on post."PK_POST_BRIEF_EMAIL" = proj."FK_POST_BRIEF_EMAIL"
            ${whereClause}
        `;

        const result = await pool.query(sql, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No records found" });
        }

        res.json(result.rows);

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to fetch data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Get single account by ID with proper field mapping
app.get("/wahl_kandidaten/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT *
            FROM "COMPANY"."T_WAHL_KANDIDATEN" proj
                WHERE proj."FK_KON_PERSON" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});




// Get single account by ID with proper field mapping
app.get("/location/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT *
            FROM "COMPANY"."V_LOC_LOCATION"
             WHERE "PK_LOC_LOCATION" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/wahl_kandidaten_stimm/:id", async (req, res) => {
    try {

     const { id } = req.params; 
        const result = await pool.query(
            `SELECT 
                   "FK_KON_PERSON",
              "PK_WAHL_KANDIDATEN",
"FK_WAHL_WAHL",
"FK_WAHL_PARTEI",
"CREATED_BY",
"CREATED_AT",
"MODIFIED_BY",
"MODIFIED_AT",
"FK_KON_PERSON",
"FK_ADR_ORT",
"PARTEI_LANG",
"PLATZ",
"VORNAME",
"NACHNAME",
"ORT",
"LANDKREIS",
"COMM",
"FK_WAHL_STIMM_BEZIRK",
"FK_WAHL_STIMM_KREIS",
"FK_MDT_MANDANT",
"LANDESVERBAND",
"KREISVERBAND",
"FK_STD_WAHL_ART",
"BEZEICHNUNG",
"PARTEI_KURZ",
pers_vorname,
pers_nachname,
"STIMMBEZIRK",
"STIMMKREIS",
fk_wahl_stimm_zettel,
fk_wahl_stimm_zettel1
                    FROM 
                        "COMPANY"."V_WAHL_KANDIDATEN" vproj 
                  WHERE fk_wahl_stimm_zettel1 = $1
                     
                    ;`, [id]
        );4
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/wahl_kandidaten/1/:id", async (req, res) => {
    try {

     const { id } = req.params; 
        const result = await pool.query(
            `SELECT 
                 *
                    FROM 
                        "COMPANY"."V_WAHL_KANDIDATEN" vproj 
                  WHERE "PK_WAHL_KANDIDATEN" = $1
                     
                    ;`, [id]
        );4
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/person_group/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT rel.*, grp."PERSON_GROUP_NAME"
            FROM "COMPANY"."T_REL_KON_PERSON_PERSON_GROUP" rel
                 left join "COMPANY"."T_KON_PERSON_GROUP" grp on grp."PK_KON_PERSON_GROUP" = rel."FK_KON_PERSON_GROUP"
             WHERE "FK_KON_PERSON" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/person_person_group/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT rel.*, pers."PK_KON_PERSON", pers."VORNAME", pers."NACHNAME"
            FROM "COMPANY"."T_REL_KON_PERSON_PERSON_GROUP" rel
               left join "COMPANY"."T_KON_PERSON" pers on pers."PK_KON_PERSON" = rel."FK_KON_PERSON"
             WHERE "FK_KON_PERSON_GROUP" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/kand/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT rel.*
            FROM "COMPANY"."V_WAHL_KANDIDATEN" rel
           
             WHERE "FK_KON_PERSON" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/wahl_kand", async (req, res) => {
    try {
   

        const result = await pool.query(
            `SELECT rel.*
            FROM "COMPANY"."V_WAHL_KANDIDATEN" rel
           
`
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/ahn_ahnentafeln_person_rel", async (req, res) => {
    try {
   

        const result = await pool.query(
            `SELECT rel.*
            FROM "COMPANY"."T_AHN_PERSON_STAMM" rel
           
`
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/person_geschwister_rel", async (req, res) => {
    try {
   

        const result = await pool.query(
            `SELECT rel.*
            FROM "COMPANY"."T_REL_KON_PERSON_GESCHWISTER" rel
           
`
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/person_lebenspartner_rel", async (req, res) => {
    try {
   

        const result = await pool.query(
            `SELECT rel.*
            FROM "COMPANY"."T_REL_KON_PERSON_LEBENSPARTNER" rel
           
`
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/person_geschw", async (req, res) => {
    try {
        const { fk_kon_person, fk_kon_geschwister } = req.query;
        
        // Validate that at least one parameter is provided
        if (!fk_kon_person && !fk_kon_geschwister) {
            return res.status(400).json({ 
                error: "Either fk_kon_person or fk_kon_geschwister parameter is required" 
            });
        }

        let query = `SELECT rel.* FROM "COMPANY"."V_AHN_DISP_GESCHWISTER" rel WHERE `;
        let params = [];
        let conditions = [];

        if (fk_kon_person) {
            if (isNaN(fk_kon_person)) {
                return res.status(400).json({ error: "Invalid fk_kon_person parameter" });
            }
            conditions.push(`"FK_KON_PERSON"::numeric = $${params.length + 1}`);
            params.push(fk_kon_person);
        }

        if (fk_kon_geschwister) {
            if (isNaN(fk_kon_geschwister)) {
                return res.status(400).json({ error: "Invalid fk_kon_geschwister parameter" });
            }
            conditions.push(`"FK_KON_GESCHWISTER"::numeric = $${params.length + 1}`);
            params.push(fk_kon_geschwister);
        }

        query += conditions.join(' OR ');

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No siblings found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch siblings",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/person_lebenspartner/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT rel.*
            FROM "COMPANY"."V_AHN_DISP_LEBENSPARTNER1" rel
           
             WHERE "PK_KON_PERSON" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/person_eltern", async (req, res) => {
    try {
        const { id, kind_pk_kon_person } = req.query;

        // Check if exactly one parameter is provided
        const hasIdParam = id && !isNaN(id);
        const hasKindParam = kind_pk_kon_person && !isNaN(kind_pk_kon_person);
        
        if (!hasIdParam && !hasKindParam) {
            return res.status(400).json({ 
                error: "Exactly one parameter must be provided: 'id' OR 'kind_pk_kon_person' (both as query parameters)" 
            });
        }
        
        if (hasIdParam && hasKindParam) {
            return res.status(400).json({ 
                error: "Only one parameter should be provided, not both. Use either 'id' OR 'kind_pk_kon_person'" 
            });
        }

        let query;
        let params;

        // Use ID parameter from query
        if (hasIdParam) {
            query = `SELECT "PK_BILD_BILDER",

"FILENAME",
"CREATED_BY",
"CREATED_AT",
"THUMBNAIL",
"H_PX",
"W_PX",
"DUMMY_BILD",
"FK_STD_KLASSIFIKATION1",
"FK_STD_KLASSIFIKATION2",
"FK_BILD_OLD",
"KLASSIFIKATION_1",
"KLASSIFIKATION_2",
"MIMETYPE",
"COMM",
"QUALITY",
"ORDNER1",
"ORDNER2",
"FK_ABL_ORDNER_PAGE",
"CNT_SUB_BILDER",
"CNT_SUB_BILDER_ERFASST",
"FK_KON_PERSON",
"PK_KON_PERSON",
"VORNAME",
"NACHNAME",
"GEBURTSJAHR",
"STERBEJAHR",
"PK_WAHL_KANDIDATEN",
"FK_WAHL_WAHL",
"kand_comm",
"kand_beschreibung",
"kind_pk_kon_person",

"kind_filename",
"kind_nachname",
"kind_vorname",
"FK_STD_KON_PERSON_GESCHLECHT",
"kind_fk_std_kon_person_geschlecht" ,
"PK_REL_AHN_PERSON_ELTERN"
FROM "COMPANY"."V_AHN_ELTERN_KIND_BILD" rel WHERE "PK_KON_PERSON" = $1`;
            params = [id];
        }
        // Use kind_pk_kon_person parameter from query
        else if (hasKindParam) {
            query = `SELECT 

"PK_BILD_BILDER",

"FILENAME",
"CREATED_BY",
"CREATED_AT",
"THUMBNAIL",
"H_PX",
"W_PX",
"DUMMY_BILD",
"FK_STD_KLASSIFIKATION1",
"FK_STD_KLASSIFIKATION2",
"FK_BILD_OLD",
"KLASSIFIKATION_1",
"KLASSIFIKATION_2",
"MIMETYPE",
"COMM",
"QUALITY",
"ORDNER1",
"ORDNER2",
"FK_ABL_ORDNER_PAGE",
"CNT_SUB_BILDER",
"CNT_SUB_BILDER_ERFASST",
"FK_KON_PERSON",
"PK_KON_PERSON",
"VORNAME",
"NACHNAME",
"GEBURTSJAHR",
"STERBEJAHR",
"PK_WAHL_KANDIDATEN",
"FK_WAHL_WAHL",
"kand_comm",
"kand_beschreibung",
"kind_pk_kon_person",

"kind_filename",
"kind_nachname",
"kind_vorname",
"FK_STD_KON_PERSON_GESCHLECHT",
"kind_fk_std_kon_person_geschlecht",
"PK_REL_AHN_PERSON_ELTERN"
 FROM "COMPANY"."V_AHN_ELTERN_KIND_BILD" rel WHERE "kind_pk_kon_person" = $1`;
            params = [kind_pk_kon_person];
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No records found for this parameter" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch records",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/person_religion/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT ein.*,
reg."STD_NAME"
            FROM "COMPANY"."T_REL_AHN_PERSON_RELIGION" ein
                left join (select * from "COMPANY"."T_STD" where "FK_STD_GROUP" = 685) reg on reg."STD_VALUE" = ein."RELIGION"
          
             WHERE "FK_KON_PERSON" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get('/rel-org-org-unit-lehr-einsendeaufgabe', async (req, res) => { try { const { fk_mdt_mandant, fk_org_unit, fk_lehr_einsendeaufgabe } = req.query; const conditions = []; const values = []; if (fk_mdt_mandant) { values.push(fk_mdt_mandant); conditions.push(`"FK_MDT_MANDANT" = $${values.length}`); } if (fk_org_unit) { values.push(fk_org_unit); conditions.push(`"FK_ORG_UNIT" = $${values.length}`); } if (fk_lehr_einsendeaufgabe) { values.push(fk_lehr_einsendeaufgabe); conditions.push(`"FK_LEHR_EINSENDEAUFGABE" = $${values.length}`); } const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''; const sql = ` SELECT "PK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE", "FK_MDT_MANDANT", "FK_ORG_UNIT", "FK_LEHR_EINSENDEAUFGABE" FROM "COMPANY"."T_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE" ${where} ORDER BY "PK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE" `; const result = await pool.query(sql, values); res.json(result.rows); } catch (err) { console.error('GET error:', err); res.status(500).json({ error: 'internal_error' }); } });

app.get("/lehr_einsendeaufgabe/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT ein.*,
reg."REGION"
            FROM "COMPANY"."T_LEHR_EINSENDEAUFGABE" ein
                left join "COMPANY"."T_ADR_REGION" reg on reg."PK_ADR_REGION" = ein."FK_ADR_REGION"
          
             WHERE "FK_LEHR_LEHRGANG" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/lehr_einsendeaufgabe_lehrer/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT *
            FROM "COMPANY"."T_LEHR_EINSENDEAUFGABE_LEHRER" ein
               join "COMPANY"."T_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE" relorg on relorg."PK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE" = ein."FK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE"
               left join "COMPANY"."T_KON_PERSON" pers on pers."PK_KON_PERSON" = ein."FK_KON_PERSON_LEHRER"
               left join "COMPANY"."T_LEHR_EINSENDEAUFGABE" eins on eins."PK_LEHR_EINSENDEAUFGABE" = relorg."FK_LEHR_EINSENDEAUFGABE"
          
             WHERE "FK_ORG_UNIT" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/lehr_fragen/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT frg.*,
                 std."STD_NAME",
                 reg."REGION"
            FROM "COMPANY"."T_LEHR_FRAGE" frg
                 left join (select * from  "COMPANY"."T_STD" where "FK_STD_GROUP" = 1803) std on std."STD_VALUE"::double precision = frg."FK_STD_LEHR_THEME"
                 left join "COMPANY"."T_LEHR_EINSENDEAUFGABE" ein on ein."PK_LEHR_EINSENDEAUFGABE" = frg."FK_LEHR_EINSENDEAUFGABE"
                 left join "COMPANY"."T_ADR_REGION" reg on reg."PK_ADR_REGION" = ein."FK_ADR_REGION"
             WHERE "FK_LEHR_EINSENDEAUFGABE" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/std/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT * 
            FROM "COMPANY"."T_STD"  
             WHERE "FK_STD_GROUP" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/org_unit_branches_rel/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT * 
            FROM "COMPANY"."T_REL_ORG_ORG_UNIT_BRANCHES" relbra
                left join  "COMPANY"."T_BAS_ORG_BRANCHES" bra on bra."PK_BAS_ORG_BRANCHES" = relbra."FK_BAS_ORG_BRANCHES"
                left join "COMPANY"."T_ORG_UNIT" org on org."PK_ORG_UNIT" = relbra."FK_ORG_ORG_UNIT"
             WHERE "FK_ORG_ORG_UNIT" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/org_unit_marken_rel/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT * 
            FROM "COMPANY"."T_ORG_UNIT" relorg
              join "COMPANY"."T_REL_ORG_ORG_UNIT_ORG_UNIT_ORG_MARKE" relmrk on relmrk."FK_ORG_ORG_UNIT" = relorg."PK_ORG_UNIT"
                left join  "COMPANY"."T_BAS_ORG_MARKEN" mrk on mrk."PK_BAS_ORG_MARKEN" = relmrk."FK_BAS_ORG_MARKE"
            WHERE relorg."PK_ORG_UNIT" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/kontenplan_kat/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT * 
            FROM "COMPANY"."T_LEX_KONTENPLAN_KONTEN_KAT"
             WHERE "FK_LEX_KONTENPLAN_KONTEN_KAT_GRP" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/org_unit_marken_bild_rel/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT * 
            FROM "COMPANY"."T_ORG_UNIT" relorg
              join "COMPANY"."T_REL_ORG_ORG_UNIT_ORG_UNIT_ORG_MARKE" relmrk on relmrk."FK_ORG_ORG_UNIT" = relorg."PK_ORG_UNIT"
left join "COMPANY"."T_REL_ORG_ORG_UNIT_ORG_UNIT_ORG_MARKE_BILD" relmrkb on relmrkb."FK_REL_ORG_ORG_UNIT_ORG_UNIT_ORG_MARKE" = relmrk."PK_REL_ORG_ORG_UNIT_ORG_UNIT_ORG_MARKE"
 left join "COMPANY"."T_BILD_BILDER" bild on bild."PK_BILD_BILDER" = relmrkb."FK_BILD_BILDER" 
                left join  "COMPANY"."T_BAS_ORG_MARKEN" mrk on mrk."PK_BAS_ORG_MARKEN" = relmrk."FK_BAS_ORG_MARKE"
            WHERE relorg."PK_ORG_UNIT" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/org_unit_internetapp_rel/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT * 
            FROM "COMPANY"."T_ORG_UNIT" relorg
              join "COMPANY"."T_REL_ORG_ORG_UNIT_ORG_UNIT_INT_INTERNETPORTAL_APP" relmrk on relmrk."FK_ORG_ORG_UNIT" = relorg."PK_ORG_UNIT"
                left join  "COMPANY"."T_INT_INTERNETPORTAL_APP" mrk on mrk."PK_INT_INTERNETPORTAL_APP" = relmrk."FK_INT_INTERNETPORTAL_APP"
            WHERE relorg."PK_ORG_UNIT" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/org_unit_bild_rel/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT * 
            FROM (select distinct "FK_INP_BELEGE_ALL", "FK_ORG_UNIT" from "COMPANY"."T_REL_KON_GESCHAEFTSPARTNER_KONTAKT") relorg
              join "COMPANY"."T_INP_BELEGE_ALL" relmrk on relmrk."PK_INP_BELEGE_ALL" = relorg."FK_INP_BELEGE_ALL"
                left join  "COMPANY"."T_REL_INP_INP_BELEGE_ALL_BILD_BILDER" mrk on mrk."FK_INP_BELEGE_ALL" = relmrk."PK_INP_BELEGE_ALL"
left join  (select * from "COMPANY"."T_BILD_BILDER" where "KLASSIFIKATION_1" != 'Visitenkarten') mrk1 on mrk1."PK_BILD_BILDER" = relmrk."FK_BILD_BILDER"
            WHERE relorg."FK_ORG_ORG_UNIT" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});



app.get("/org_unit_branchen_produkte_rel/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT * 
            FROM "COMPANY"."T_ORG_UNIT" relorg
              join "COMPANY"."T_REL_ORG_ORG_UNIT_BRANCHES_PROD_PRODUCT" relbraprod on relbraprod."FK_ORG_ORG_UNIT" = relorg."PK_ORG_UNIT"
left join  "COMPANY"."T_REL_BAS_ORG_BRANCHES_PROD_PRODUCT" braprod on braprod."PK_REL_BAS_ORG_BRANCHES_PROD_PRODUCT" =  relbraprod."FK_REL_BAS_ORG_BRANCHES_PROD_PRODUCT"
                left join  "COMPANY"."T_BAS_ORG_BRANCHES" bra on braprod."FK_BAS_ORG_BRANCHES" = bra."PK_BAS_ORG_BRANCHES"
     left join  "COMPANY"."T_PROD_PRODUCT" prod on braprod."FK_PROD_PRODUCT" = prod."PK_PROD_PRODUCT"
               

             WHERE relorg."PK_ORG_UNIT" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});



app.get("/rel_org_unit/:id/:main_id", async (req, res) => {
    try {
        const { id, main_id } = req.params;
        
        // Validate ID parameters
        if (!id || isNaN(id) || !main_id || isNaN(main_id)) {
            return res.status(400).json({ error: "Invalid organizational unit IDs" });
        }

        const result = await pool.query(
            `SELECT * 
            FROM "COMPANY"."V_REL_ORG_UNIT_RELATIONSHIP_DETAILS"  
            WHERE "Main_Org_Unit_Reference" = $1
            UNION SELECT * 
            FROM "COMPANY"."V_REL_ORG_UNIT_RELATIONSHIP_DETAILS"  
            WHERE "Related_Org_Unit_Reference" = $2`,
            [id, main_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No relationships found for these organizational units" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch organizational unit relationships",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});



app.get("/lehr_loesung/:id", async (req, res) => {
    try {
        const { id } = req.params; // Now this will work
        
        // Rest of your code remains the same
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const result = await pool.query(
            `SELECT ls.*,
               bild."PK_BILD_BILDER",
                bild."FILECONTENT",
bild."FILENAME",
bild."KLASSIFIKATION_1",
bild."KLASSIFIKATION_2"
            FROM "COMPANY"."T_REL_LEHR_FRAGE_LOESUNG" rel 
             join  "COMPANY"."T_LEHR_LOESUNG" ls on ls."PK_LEHR_LOESUNG" = rel."FK_LEHR_LOESUNG"
             left join "COMPANY"."T_REL_LEHR_FRAGE_LOESUNG_BILD" rel1 on rel1."FK_REL_LEHR_FRAGE_LOESUNG" = rel."PK_REL_LEHR_FRAGE_LOESUNG"
             left join "COMPANY"."T_BILD_BILDER" bild on bild."PK_BILD_BILDER" = rel1."FK_BILD_BILDER"
          
             WHERE "FK_LEHR_FRAGE" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No candidates found for this project" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch candidates",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});




//1 -  Get all accounts
app.get("/transactions", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                    zus.*, 
                    pay."TRANSAKTIONSCODE",
                    pay."RECHNUNGSNUMMER"
                    FROM 
                        "COMPANY"."V_KTO_KONTEN_ZUS" zus
                      left Join "COMPANY"."T_KTO_PAYPAL" pay on zus."FK_MAIN_KEY" = pay."FK_MAIN_KEY"
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


//1 -  Get all accounts
app.get("/kontenplan_typ", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                    *
from 
                
                        "COMPANY"."T_LEX_KONTENPLAN_KONTEN_TYP" zus
                   
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

//1 -  Get all accounts
app.get("/kontenplan_klasse", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
from 
                
                    
                        "COMPANY"."T_LEX_KONTENPLAN_KONTEN_KL" zus
                   
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

//1 -  Get all accounts
app.get("/kontenplan_grp", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
from 
                
                    
                        "COMPANY"."T_LEX_KONTENPLAN_GRP" zus
                   
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/kontenplan_kat_grp", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
from 
                    
                        "COMPANY"."T_LEX_KONTENPLAN_KONTEN_KAT_GRP" zus
                   
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/proj_projects", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   vproj.*,
                   proj."FK_STD_PROJ_PROJEKT_ART",
                   proj."FK_MDT_MANDANT",
                   proj."FK_REL_KON_PERSON_WORK_BERUF",
                   proj."FK_ORG_UNIT",
                   proj."FK_KON_PERSON",
                   proj."DATUM_OK_VON_BIS", 
                   proj."FK_KON_PERSON",
 proj."FK_STD_PROJ_PROJEKT_ART_SUB",
std."STD_NAME" "PROJEKT_ART_SUB"
                    FROM 
                        "COMPANY"."V_PROJ_PROJEKTE" vproj 
                         LEFT JOIN "COMPANY"."T_PROJ_PROJEKT" proj on vproj."PK_PROJ_PROJEKT"= proj."PK_PROJ_PROJEKT"
left join (select "STD_NAME", "STD_VALUE" from "COMPANY"."T_STD" where "FK_STD_GROUP" =19 ) std on std."STD_VALUE"::numeric =  proj."FK_STD_PROJ_PROJEKT_ART_SUB"
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/beruf_dienstl_tag", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."T_WORK_DIENSTLEISTUNG_TAG" vproj 
                        
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/beruf_dienstl_auftragsliste", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."T_WORK_DIENSTLEISTUNG_AUFTRAGSLISTE" vproj 
                        
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});




app.get("/wahl_kandidaten", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   vw."FK_KON_PERSON",
              vw."PK_WAHL_KANDIDATEN",
vw."FK_WAHL_WAHL",
vw."FK_WAHL_PARTEI",
vw."CREATED_BY",
vw."CREATED_AT",
vw."MODIFIED_BY",
vw."MODIFIED_AT",
vw."FK_KON_PERSON",
vw."FK_ADR_ORT",
vw."PARTEI_LANG",
vw."PLATZ",
vw."VORNAME" cand_vorname,
vw."NACHNAME" cand_nachname,
vw."ORT",
vw."LANDKREIS",
vw."COMM",
vw."FK_WAHL_STIMM_BEZIRK",
vw."FK_WAHL_STIMM_KREIS",
vw."FK_MDT_MANDANT",
vw."LANDESVERBAND",
vw."KREISVERBAND",
vw."FK_STD_WAHL_ART",
vw."BEZEICHNUNG",
vw."PARTEI_KURZ",
vw."pers_vorname",
vw."pers_nachname",
vw."STIMMBEZIRK",
vw."STIMMKREIS",
vw."fk_wahl_stimm_zettel",
vw."BERUF",
vw."DATUM_OK",
kand."wahlkreis",
kand."Wahlkreis-Nummer",
kand."Wahl-Id",
kand."gruppenschluessel",
kand."Gruppe-Name",
kand."Gruppe-Zusatzbezeichnung",
kand."Gruppe-Kurzname",
kand."Wahlvorschlag-Zulassungsstatus",
kand."Wahlvorschlag-Art",
kand."Wahlvorschlag-Stimmzettelposition",
kand."Wahlvorschlag-Name",
kand."Wahlvorschlag-Zusatzbezeichnung",
kand."Wahlvorschlag-Kurzname",
kand."Kandidatur-Art",
kand."Kandidatur-Listenposition-Stimmzettel",
kand."Kandidatur-Titel",
kand."Kandidatur-Namensbestandteile",
kand."Kandidatur-Rufname",
kand."Kandidatur-Geschlecht",
kand."Kandidatur-Geburtsort",
kand."Kandidatur-Anschrift-Ort",
kand."Kandidatur-Anschrift-Postleitzahl",
kand."wahlkreisnummer",
kand."geschlecht",
kand."geschlecht1",
vw."pers_geburtsjahr",
kand."BERUF_ALLG",
vpers.*,
tpers.*
--vw."BILD4"
                    FROM 
                        "COMPANY"."V_WAHL_KANDIDATEN" vw 
  left join  "COMPANY"."T_WAHL_KANDIDATEN" kand on vw."PK_WAHL_KANDIDATEN" = kand."PK_WAHL_KANDIDATEN" 
left join "COMPANY"."T_KON_PERSON" tpers on tpers."PK_KON_PERSON" = kand."FK_KON_PERSON"
left join "COMPANY"."V_KON_PERSON" vpers on vpers."PK_KON_PERSON" = kand."FK_KON_PERSON"
                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/wahl_kandidat_person_zuweisen/:kandidatId", async (req, res) => {
    try {
        const kandidatId = req.params.kandidatId;
        
        if (isNaN(kandidatId)) {
            return res.status(400).json({ error: "Invalid kandidat ID" });
        }

        const result = await pool.query(
            `SELECT "COMPANY"."F_WAHL_KANDIDAT_PERSON_ZUWEISEN"($1) as person_id;`,
            [kandidatId]
        );
        
        const personId = result.rows[0].person_id;

        console.log('   • Person ID:  ', personId);
        
        res.json({
            success: true,
            kandidatId: parseInt(kandidatId),
            personId: personId,
            message: personId > 0 ? 
                `Person ${personId} created and assigned` : 
                `Function returned ${personId}`
        });
        
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.put("/wahl_kandidat_person_zuweisen/update/:kandidatId", async (req, res) => {
    try {
        const kandidatId = req.params.kandidatId;
        const { personId } = req.body; // Get personId from request body
        
        // Validate required parameters
        if (!kandidatId || isNaN(kandidatId)) {
            return res.status(400).json({ 
                error: "Invalid or missing kandidatId parameter. Must be a number.",
                example: "/wahl-kandidat-person-zuweisen/42880"
            });
        }
        
        if (!personId || isNaN(personId)) {
            return res.status(400).json({ 
                error: "Invalid or missing personId in request body. Must be a number.",
                example: { "personId": 86993 }
            });
        }

        // Execute the UPDATE statement
        const result = await pool.query(
            `UPDATE "COMPANY"."T_WAHL_KANDIDATEN" 
             SET "FK_KON_PERSON" = $1 
             WHERE "PK_WAHL_KANDIDATEN" = $2 
             RETURNING *;`,
            [personId, kandidatId]
        );
        
        // Check if any row was updated
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: `No candidate found with ID: ${kandidatId}`
            });
        }
        
        // Return success response with updated data
        res.json({
            success: true,
            message: `Candidate ${kandidatId} successfully assigned to person ${personId}`,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to assign person to candidate",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.put("/wahl-kandidaten/update/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ 
                success: false, 
                error: "Invalid candidate ID" 
            });
        }
        
        // Check if candidate exists
        const checkResult = await pool.query(
            `SELECT "PK_WAHL_KANDIDATEN" FROM "COMPANY"."T_WAHL_KANDIDATEN" WHERE "PK_WAHL_KANDIDATEN" = $1`,
            [id]
        );
        
        if (checkResult.rowCount === 0) {
            return res.status(404).json({ 
                success: false, 
                error: `Candidate with ID ${id} not found` 
            });
        }
        
        // Build dynamic UPDATE query
        const setClauses = [];
        const values = [];
        let paramCount = 1;
        
        // Helper to add field for update
        const addUpdateField = (fieldName, value) => {
            if (value !== undefined) {
                setClauses.push(`"${fieldName}" = $${paramCount++}`);
                values.push(value === '' ? null : value);
            }
        };
        
        // Add all fields that might be updated
        addUpdateField('FK_WAHL_WAHL', updateData.FK_WAHL_WAHL);
        addUpdateField('FK_WAHL_PARTEI', updateData.FK_WAHL_PARTEI);
        addUpdateField('FK_MDT_MANDANT', updateData.FK_MDT_MANDANT);
        addUpdateField('VORNAME', updateData.VORNAME);
        addUpdateField('NACHNAME', updateData.NACHNAME);
        addUpdateField('FK_KON_PERSON', updateData.FK_KON_PERSON);
        addUpdateField('GEBURTSJAHR', updateData.GEBURTSJAHR);
        addUpdateField('GESCHLECHT', updateData.GESCHLECHT);
        addUpdateField('BERUF', updateData.BERUF);
        addUpdateField('BERUF_ALLG', updateData.BERUF_ALLG);
        addUpdateField('BESCHREIBUNG', updateData.BESCHREIBUNG);
        addUpdateField('EMAIL', updateData.EMAIL);
        addUpdateField('ORT', updateData.ORT);
        addUpdateField('LANDKREIS', updateData.LANDKREIS);
        addUpdateField('FK_ADR_ORT', updateData.FK_ADR_ORT);
        addUpdateField('FK_ADR_PLZ_ORT', updateData.FK_ADR_PLZ_ORT);
        addUpdateField('FK_ADR_REGION2', updateData.FK_ADR_REGION2);
        addUpdateField('wahlkreis', updateData.wahlkreis);
        addUpdateField('wahlkreisnummer', updateData.wahlkreisnummer);
        addUpdateField('PARTEI_LANG', updateData.PARTEI_LANG);
        addUpdateField('PLATZ', updateData.PLATZ);
        addUpdateField('LANDESVERBAND', updateData.LANDESVERBAND);
        addUpdateField('KREISVERBAND', updateData.KREISVERBAND);
        addUpdateField('STADTVERBAND', updateData.STADTVERBAND);
        addUpdateField('FK_WAHL_VERBAND_LAND', updateData.FK_WAHL_VERBAND_LAND);
        addUpdateField('FK_WAHL_VERBAND_KREIS', updateData.FK_WAHL_VERBAND_KREIS);
        addUpdateField('FK_WAHL_VERBAND_STADT', updateData.FK_WAHL_VERBAND_STADT);
        addUpdateField('FK_WAHL_STIMM_BEZIRK', updateData.FK_WAHL_STIMM_BEZIRK);
        addUpdateField('FK_WAHL_STIMM_KREIS', updateData.FK_WAHL_STIMM_KREIS);
        addUpdateField('FK_WAHL_LANDESLISTE', updateData.FK_WAHL_LANDESLISTE);
        addUpdateField('FK_WAHL_STIMM_ZETTEL', updateData.FK_WAHL_STIMM_ZETTEL);
        addUpdateField('SPITZENKANDIDAT', updateData.SPITZENKANDIDAT);
        addUpdateField('Kanzlerkandidat', updateData.Kanzlerkandidat);
        addUpdateField('VORSITZENDER', updateData.VORSITZENDER);
        addUpdateField('FLG_PERSON_UNBEKANNT', updateData.FLG_PERSON_UNBEKANNT);
        addUpdateField('FLG_FRAGLICH', updateData.FLG_FRAGLICH);
        addUpdateField('eingetreten_am', updateData.eingetreten_am);
        addUpdateField('ausgetreten_am', updateData.ausgetreten_am);
        addUpdateField('OK_DATUM', updateData.OK_DATUM);
        addUpdateField('ERG_MANDAT', updateData.ERG_MANDAT);
        addUpdateField('ERG_ANZ_STIMMEN', updateData.ERG_ANZ_STIMMEN);
        addUpdateField('ERG_PROZENT', updateData.ERG_PROZENT);
        addUpdateField('ERG_ANZ_STIMMEN_BRIEF', updateData.ERG_ANZ_STIMMEN_BRIEF);
        addUpdateField('ERG_PROZENT_BRIEF', updateData.ERG_PROZENT_BRIEF);
        addUpdateField('ERG_ANZ_STIMMEN_URNE', updateData.ERG_ANZ_STIMMEN_URNE);
        addUpdateField('ERG_PROZENT_URNE', updateData.ERG_PROZENT_URNE);
        addUpdateField('ERGEBNIS', updateData.ERGEBNIS);
        addUpdateField('POSITION_NEW', updateData.POSITION_NEW);
        addUpdateField('AUSSCHUSS_NEW', updateData.AUSSCHUSS_NEW);
        addUpdateField('AUSSCHUSS_OLD', updateData.AUSSCHUSS_OLD);
        addUpdateField('POSITION_OLD', updateData.POSITION_OLD);
        addUpdateField('KREISVORSTAND_POSITION_OLD', updateData.KREISVORSTAND_POSITION_OLD);
        addUpdateField('EXTERNAL_NR', updateData.EXTERNAL_NR);
        addUpdateField('EXTERNE_PERSON_NR', updateData.EXTERNE_PERSON_NR);
        addUpdateField('LINK_WEBSEITE_PERSON', updateData.LINK_WEBSEITE_PERSON);
        addUpdateField('FK_STD_KAND_WAHL_ERG_TYPE', updateData.FK_STD_KAND_WAHL_ERG_TYPE);
        addUpdateField('FK_STD_WAHL_KAND_FRAKTIONS_TYPE', updateData.FK_STD_WAHL_KAND_FRAKTIONS_TYPE);
        addUpdateField('FK_STD_WAHL_KANDIDAT_ART_DER_VERAENDERUNG', updateData.FK_STD_WAHL_KANDIDAT_ART_DER_VERAENDERUNG);
        addUpdateField('fk_wahl_kandidaten_nachfolger', updateData.fk_wahl_kandidaten_nachfolger);
        addUpdateField('Vorgeschlagen durch', updateData.Vorgeschlagen_durch);
        addUpdateField('ausgeschieden', updateData.ausgeschieden);
        addUpdateField('COMM', updateData.COMM);
        addUpdateField('COMM_FRAGLICH', updateData.COMM_FRAGLICH);
        addUpdateField('unternehmen', updateData.unternehmen);
        addUpdateField('ZYKLUS', updateData.ZYKLUS);
        addUpdateField('LFD_NR', updateData.LFD_NR);
        addUpdateField('LFD_NR1', updateData.LFD_NR1);
        addUpdateField('DATUM_VERAENDERUNG', updateData.DATUM_VERAENDERUNG);
        addUpdateField('VERAENDERUNG', updateData.VERAENDERUNG);
        addUpdateField('gruppenschluessel', updateData.gruppenschluessel);
        addUpdateField('Gruppe-Name', updateData["Gruppe-Name"]);
        addUpdateField('Gruppe-Zusatzbezeichnung', updateData["Gruppe-Zusatzbezeichnung"]);
        addUpdateField('Gruppe-Kurzname', updateData["Gruppe-Kurzname"]);
        addUpdateField('Wahlvorschlag-Zulassungsstatus', updateData["Wahlvorschlag-Zulassungsstatus"]);
        addUpdateField('Wahlvorschlag-Art', updateData["Wahlvorschlag-Art"]);
        addUpdateField('Wahlvorschlag-Stimmzettelposition', updateData["Wahlvorschlag-Stimmzettelposition"]);
        addUpdateField('Wahlvorschlag-Name', updateData["Wahlvorschlag-Name"]);
        addUpdateField('Wahlvorschlag-Zusatzbezeichnung', updateData["Wahlvorschlag-Zusatzbezeichnung"]);
        addUpdateField('Wahlvorschlag-Kurzname', updateData["Wahlvorschlag-Kurzname"]);
        addUpdateField('Kandidatur-Art', updateData["Kandidatur-Art"]);
        addUpdateField('Kandidatur-Listenposition-Stimmzettel', updateData["Kandidatur-Listenposition-Stimmzettel"]);
        addUpdateField('Kandidatur-Titel', updateData["Kandidatur-Titel"]);
        addUpdateField('Kandidatur-Namensbestandteile', updateData["Kandidatur-Namensbestandteile"]);
        addUpdateField('Kandidatur-Rufname', updateData["Kandidatur-Rufname"]);
        addUpdateField('Kandidatur-Geschlecht', updateData["Kandidatur-Geschlecht"]);
        addUpdateField('Kandidatur-Geburtsort', updateData["Kandidatur-Geburtsort"]);
        addUpdateField('Kandidatur-Anschrift-Ort', updateData["Kandidatur-Anschrift-Ort"]);
        addUpdateField('Kandidatur-Anschrift-Postleitzahl', updateData["Kandidatur-Anschrift-Postleitzahl"]);
        
        // Always update modification metadata
        addUpdateField('MODIFIED_BY', updateData.MODIFIED_BY || 'SYSTEM');
        addUpdateField('MODIFIED_AT', new Date());
        
        // Add the ID parameter
        values.push(id);
        
        const updateQuery = `
            UPDATE "COMPANY"."T_WAHL_KANDIDATEN" 
            SET ${setClauses.join(', ')}
            WHERE "PK_WAHL_KANDIDATEN" = $${paramCount}
            RETURNING *;
        `;
        
        const result = await pool.query(updateQuery, values);
        
        res.json({
            success: true,
            message: "Candidate updated successfully",
            data: result.rows[0]
        });
    } catch (error) {
        console.error("Error updating candidate:", error);
        res.status(500).json({ 
            success: false, 
            error: "Failed to update candidate",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/adr_plz_ort", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."V_ADR_PLZ_ORT" vadr 
                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/adr_ortskunde", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."T_ADR_ADRESSEN_ORTSKUNDE_NBG" vproj 
                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/ver_vertrag", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   ver.*,
                   vart."STD_NAME" vertragsart,
                   vstat."STD_NAME" vertragsstatus
                    FROM 
                        "COMPANY"."T_VER_VERTRAG" ver
                    left join (select * from "COMPANY"."T_STD" where "FK_STD_GROUP" = 421) vart on vart."STD_VALUE"::double precision = ver."FK_STD_VER_VERTRAGSART"
  left join (select * from "COMPANY"."T_STD" where "FK_STD_GROUP" = 1423) vstat on vart."STD_VALUE"::double precision = ver."FK_STD_VER_STATUS"
                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/wahl_kand/1/", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
    vproj.*
FROM 
    "COMPANY"."T_WAHL_KANDIDATEN" vproj 

                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/grenze_lkw/", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
               *
             FROM "COMPANY"."T_GRENZE_LKW";`
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to fetch grenze_lkw",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.post("/grenze_lkw/insert", async (req, res) => {
    try {
        const data = req.body;

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_GRENZE_LKW" (
                "BESCHRIFTUNG",
               
                "PARKPLATZ_LINKS",
                "PARKPLATZ_RECHTS",

            "DURCHFAHRT_LINKS_RI_DE",
                "DATUM",
                "DURCHLEUCHTUNG",
"BUS",

"GROSSRAUM",
"ZOLLKONTROLLE",
"DURCHFAHRT_LINKS_RI_CH",
"PARKPLATZ_AUSFAHRT",
"FK_LOC_LOCATION",
"DURCHFAHRT_RECHTS"
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
            )
            RETURNING *;`,
            [
                data.BESCHRIFTUNG,
                
                data.PARKPLATZ_LINKS,
                data.PARKPLATZ_RECHTS,
                data.DURCHFAHRT_LINKS_RI_DE,
                data.DATUM,
                data.DURCHLEUCHTUNG,
 data.BUS,
 data.GROSSRAUM,
 data.ZOLLKONTROLLE,
 data.DURCHFAHRT_LINKS_RI_CH,
data.PARKPLATZ_AUSFAHRT,
data.FK_LOC_LOCATION,
data.DURCHFAHRT_RECHTS
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to insert grenze_lkw",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.put("/grenze_lkw/update/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;

        const fields = Object.keys(data)
            .map((key, idx) => `"${key}" = $${idx + 1}`)
            .join(", ");

        const values = Object.values(data);

        const result = await pool.query(
            `UPDATE "COMPANY"."T_GRENZE_LKW"
             SET ${fields}
             WHERE "PK_GRENZE_LKW" = $${values.length + 1}
             RETURNING *;`,
            [...values, id]
        );

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to update grenze_lkw",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.delete("/grenze_lkw/delete/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const result = await pool.query(
            `DELETE FROM "COMPANY"."T_GRENZE_LKW"
             WHERE "PK_GRENZE_LKW" = $1
             RETURNING *;`,
            [id]
        );

        res.status(200).json({
            deleted: result.rows[0] || null
        });
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to delete grenze_lkw",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/grenze_lkw/all", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
               *
             FROM "COMPANY"."T_GRENZE_LKW";`
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to fetch grenze_lkw",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/mandant", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
    *
FROM 
    "COMPANY"."T_MDT_MANDANT" 

                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/std/single/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Student ID is required"
            });
        }

        const result = await pool.query(
            `SELECT * FROM "COMPANY"."T_STD" WHERE "PK_STD" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Student record not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to fetch student record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.delete("/std/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Student ID is required"
            });
        }

        // Check if record exists
        const checkResult = await pool.query(
            `SELECT "PK_STD", "STD_NAME" FROM "COMPANY"."T_STD" WHERE "PK_STD" = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Student record not found",
                details: `No student with id = ${id}`
            });
        }

        // Delete the record
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_STD" WHERE "PK_STD" = $1 RETURNING "PK_STD", "STD_NAME"`,
            [id]
        );

        res.json({
            success: true,
            message: "Student record deleted successfully",
            deletedRecord: deleteResult.rows[0]
        });

    } catch (error) {
        console.error("Database error during deletion:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to delete student record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.post("/paypal_gr/update/:fkMainKey", async (req, res) => {
    try {
        const { fkMainKey } = req.params;
        const keep = req.query.keep;

        if (!fkMainKey) {
            return res.status(400).json({ success: false, error: "FK_MAIN_KEY is required" });
        }

        const checkResult = await pool.query(
            `SELECT "FK_MAIN_KEY" FROM "COMPANY"."T_KTO_PAYPAL_GUTHABEN_RELEVANT" WHERE "FK_MAIN_KEY" = $1`,
            [fkMainKey]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Record not found",
                details: `No record with FK_MAIN_KEY = ${fkMainKey}`
            });
        }

        const updateResult = await pool.query(
            `UPDATE "COMPANY"."T_KTO_PAYPAL_GUTHABEN_RELEVANT"
             SET "KEEP" = $1, "MODIFIED_AT" = NOW(), "MODIFIED_BY" = 'system'
             WHERE "FK_MAIN_KEY" = $2
             RETURNING "FK_MAIN_KEY", "KEEP"`,
            [Number(keep), fkMainKey]
        );

        res.json({
            success: true,
            message: "Record updated",
            updatedRecord: updateResult.rows[0]
        });

    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});


app.post("/bild/final/update/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            FINAL_CNT_FK_INP_BELEGE_ALL,
            FINAL_CNT_FK_KTO_KONTO_AUSZUG,
            FINAL_CNT_FK_INV_INVENTARE,
            FINAL_CNT_FK_KON_PERSON,
            FINAL_CNT_FK_WAHL_PARTEI,
            FINAL_CNT_FK_WAHL_STIMM_ZETTEL
        } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "PK_BILD_BILDER is required"
            });
        }

        // Validate required params
        if (
            FINAL_CNT_FK_INP_BELEGE_ALL === undefined ||
            FINAL_CNT_FK_KTO_KONTO_AUSZUG === undefined
        ) {
            return res.status(400).json({
                success: false,
                error: "Both FINAL_CNT_FK_INP_BELEGE_ALL and FINAL_CNT_FK_KTO_KONTO_AUSZUG are required"
            });
        }

        // Check if record exists
        const checkResult = await pool.query(
            `SELECT "PK_BILD_BILDER"
             FROM "COMPANY"."T_BILD_BILDER"
             WHERE "PK_BILD_BILDER" = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Record not found",
                details: `No record with PK_BILD_BILDER = ${id}`
            });
        }

        console.log('Input parameters:', {
            FINAL_CNT_FK_INP_BELEGE_ALL: Number(FINAL_CNT_FK_INP_BELEGE_ALL),
            FINAL_CNT_FK_KTO_KONTO_AUSZUG: Number(FINAL_CNT_FK_KTO_KONTO_AUSZUG),
            FINAL_CNT_FK_INV_INVENTARE: Number(FINAL_CNT_FK_INV_INVENTARE),
            FINAL_CNT_FK_KON_PERSON: Number(FINAL_CNT_FK_KON_PERSON),
            FINAL_CNT_FK_WAHL_PARTEI: Number(FINAL_CNT_FK_WAHL_PARTEI),
            FINAL_CNT_FK_WAHL_STIMM_ZETTEL: Number(FINAL_CNT_FK_WAHL_STIMM_ZETTEL),
            id: id
        });

        // Update - FIXED: Changed WHERE clause from $3 to $7
        const updateResult = await pool.query(
            `UPDATE "COMPANY"."T_BILD_BILDER"
             SET 
                 "DATUM_ZUORD_OK" = NOW(),
                 "FINAL_CNT_FK_INP_BELEGE_ALL" = $1,
                 "FINAL_CNT_FK_KTO_KONTO_AUSZUG" = $2,
                 "FINAL_CNT_FK_INV_INVENTARE" = $3,
                 "FINAL_CNT_FK_KON_PERSON" = $4,
                 "FINAL_CNT_FK_WAHL_PARTEI" = $5,
                 "FINAL_CNT_FK_WAHL_STIMM_ZETTEL" = $6,
                 "MODIFIED_AT" = NOW(),
                 "MODIFIED_BY" = 'system'
             WHERE "PK_BILD_BILDER" = $7
             RETURNING 
                 "PK_BILD_BILDER",
                 "DATUM_ZUORD_OK",
                 "FINAL_CNT_FK_INP_BELEGE_ALL",
                 "FINAL_CNT_FK_KTO_KONTO_AUSZUG",
                 "FINAL_CNT_FK_INV_INVENTARE",
                 "FINAL_CNT_FK_KON_PERSON",
                 "FINAL_CNT_FK_WAHL_PARTEI",
                 "FINAL_CNT_FK_WAHL_STIMM_ZETTEL"
            `,
            [
                Number(FINAL_CNT_FK_INP_BELEGE_ALL),
                Number(FINAL_CNT_FK_KTO_KONTO_AUSZUG),
                Number(FINAL_CNT_FK_INV_INVENTARE),
                Number(FINAL_CNT_FK_KON_PERSON),
                Number(FINAL_CNT_FK_WAHL_PARTEI),
                Number(FINAL_CNT_FK_WAHL_STIMM_ZETTEL),
                id
            ]
        );

        console.log('Update result:', {
            rowCount: updateResult.rowCount,
            updatedRecord: updateResult.rows[0]
        });

        res.json({
            success: true,
            message: `Record updated successfully for PK_BILD_BILDER: ${updateResult.rows[0].PK_BILD_BILDER}`,
            updatedRecord: updateResult.rows[0],
            inputParameters: {
                FINAL_CNT_FK_INP_BELEGE_ALL: Number(FINAL_CNT_FK_INP_BELEGE_ALL),
                FINAL_CNT_FK_KTO_KONTO_AUSZUG: Number(FINAL_CNT_FK_KTO_KONTO_AUSZUG),
                FINAL_CNT_FK_INV_INVENTARE: Number(FINAL_CNT_FK_INV_INVENTARE),
                FINAL_CNT_FK_KON_PERSON: Number(FINAL_CNT_FK_KON_PERSON),
                FINAL_CNT_FK_WAHL_PARTEI: Number(FINAL_CNT_FK_WAHL_PARTEI),
                FINAL_CNT_FK_WAHL_STIMM_ZETTEL: Number(FINAL_CNT_FK_WAHL_STIMM_ZETTEL),
                id: id
            }
        });

    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.put("/std/update/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            stdName,
            stdNameEng,
            stdValue,
            comm,
            colorBlue,
            colorRed,
            colorSpecial,
            colorYellow,
            fkStdGroup,
            fkBasFarbe,
            mark,
            sort,
            valid,
            validFrom,
            validTo,
            modifiedBy
        } = req.body;

        // Validate required fields
        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Student ID is required"
            });
        }

        // Check if record exists
        const checkResult = await pool.query(
            `SELECT "PK_STD" FROM "COMPANY"."T_STD" WHERE "PK_STD" = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Student record not found",
                details: `No student with id = ${id}`
            });
        }

        // Build dynamic update query based on provided fields
        let updateFields = [];
        let queryParams = [];
        let paramCount = 1;

        // Always update modified_at and modified_by
        updateFields.push(`"MODIFIED_AT" = $${paramCount}`);
        queryParams.push(new Date());
        paramCount++;

        updateFields.push(`"MODIFIED_BY" = $${paramCount}`);
        queryParams.push(modifiedBy || 'system');
        paramCount++;

        // Add other fields if provided
        if (stdName !== undefined) {
            updateFields.push(`"STD_NAME" = $${paramCount}`);
            queryParams.push(stdName);
            paramCount++;
        }

        if (stdNameEng !== undefined) {
            updateFields.push(`"STD_NAME_ENG" = $${paramCount}`);
            queryParams.push(stdNameEng);
            paramCount++;
        }

        if (stdValue !== undefined) {
            updateFields.push(`"STD_VALUE" = $${paramCount}`);
            queryParams.push(stdValue);
            paramCount++;
        }

        if (comm !== undefined) {
            updateFields.push(`"COMM" = $${paramCount}`);
            queryParams.push(comm);
            paramCount++;
        }

        if (colorBlue !== undefined) {
            updateFields.push(`"COLOR_BLUE" = $${paramCount}`);
            queryParams.push(colorBlue);
            paramCount++;
        }

        if (colorRed !== undefined) {
            updateFields.push(`"COLOR_RED" = $${paramCount}`);
            queryParams.push(colorRed);
            paramCount++;
        }

        if (colorSpecial !== undefined) {
            updateFields.push(`"color_special" = $${paramCount}`);
            queryParams.push(colorSpecial);
            paramCount++;
        }

        if (colorYellow !== undefined) {
            updateFields.push(`"COLOR_YELLOW" = $${paramCount}`);
            queryParams.push(colorYellow);
            paramCount++;
        }

        if (fkStdGroup !== undefined) {
            updateFields.push(`"FK_STD_GROUP" = $${paramCount}`);
            queryParams.push(fkStdGroup);
            paramCount++;
        }

        if (fkBasFarbe !== undefined) {
            updateFields.push(`"FK_STD_BAS_FARBE" = $${paramCount}`);
            queryParams.push(fkBasFarbe);
            paramCount++;
        }

        if (mark !== undefined) {
            updateFields.push(`"MARK" = $${paramCount}`);
            queryParams.push(mark);
            paramCount++;
        }

        if (sort !== undefined) {
            updateFields.push(`"SORT" = $${paramCount}`);
            queryParams.push(sort);
            paramCount++;
        }

        if (valid !== undefined) {
            updateFields.push(`"VALID" = $${paramCount}`);
            queryParams.push(valid);
            paramCount++;
        }

        if (validFrom !== undefined) {
            updateFields.push(`"VALID_FROM" = $${paramCount}`);
            queryParams.push(validFrom);
            paramCount++;
        }

        if (validTo !== undefined) {
            updateFields.push(`"VALID_TO" = $${paramCount}`);
            queryParams.push(validTo);
            paramCount++;
        }

        if (updateFields.length <= 2) { // Only MODIFIED_AT and MODIFIED_BY were added
            return res.status(400).json({
                success: false,
                error: "No fields to update"
            });
        }

        // Add ID as the last parameter
        queryParams.push(id);

        const updateQuery = `
            UPDATE "COMPANY"."T_STD" 
            SET ${updateFields.join(', ')}
            WHERE "PK_STD" = $${paramCount}
            RETURNING "PK_STD", "STD_NAME", "STD_VALUE", "MODIFIED_AT"
        `;

        const result = await pool.query(updateQuery, queryParams);

        res.json({
            success: true,
            message: "Student record updated successfully",
            updatedRecord: result.rows[0]
        });

    } catch (error) {
        console.error("Database error during update:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to update student record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.get("/rel_org_unit", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."V_REL_ORG_UNIT_RELATIONSHIP_DETAILS" vproj 
                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/wahl/parteien", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."T_WAHL_PARTEI" vproj 
                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/org_unit", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   org.*,
                   loc."PK_LOC_LOCATION",
                   loc."vstr_hsnr",
                   loc."ADR",
                   loc."KOORDINATEN",
                   loc."FK_ADR_ADRESSE"
                    FROM 
                        "COMPANY"."T_ORG_UNIT" org
                        left join  "COMPANY"."T_REL_ORG_ORG_UNIT_LOC_LOCATION" relorg on relorg."FK_ORG_UNIT" = org."PK_ORG_UNIT"
                        left join "COMPANY"."V_LOC_LOCATION" loc on loc."PK_LOC_LOCATION" = relorg."FK_LOC_LOCATION"
                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/kon_person", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   vpers.*
                    FROM 
                        "COMPANY"."V_KON_PERSON" vpers
                    left join "COMPANY"."T_KON_PERSON" pers on vpers."PK_KON_PERSON" = pers."PK_KON_PERSON"
                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/wahl_umfragen", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   vpers.*
                    FROM 
                        "COMPANY"."T_WAHL_UMFRAGEN" vpers
                   
                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/bahn_europa", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."T_VERK_OEFF_BAHN_EUROPA" vpers
                   
                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/kon_person_group", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   grp.*, cnt
                    FROM
                        "COMPANY"."T_KON_PERSON_GROUP" grp
                    left join (select "FK_KON_PERSON_GROUP", count(*) cnt from "COMPANY"."T_REL_KON_PERSON_PERSON_GROUP" group by "FK_KON_PERSON_GROUP") cnt on cnt."FK_KON_PERSON_GROUP"= 
                grp."PK_KON_PERSON_GROUP"
                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});



app.get("/projects_by_year", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."V_PROJ_PROJEKT_YR" 
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/projects_task", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."V_REL_PROJECT_TASKS" 
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/tasks", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                *
             FROM 
                "COMPANY"."T_TSK_TASK"
             ORDER BY "PK_TSK_TASK";`
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to fetch tasks",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/tasks/:id", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                *
             FROM 
                "COMPANY"."T_TSK_TASK"
             WHERE "PK_TSK_TASK" = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Task not found" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to fetch task",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.post("/tasks/insert", async (req, res) => {
    try {
        const data = req.body;

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_TSK_TASK" (
                "FK_MDT_MANDANT", "TASK", "DESCR", "COMM", "DATUM_FAELLIGKEIT",
                "FK_KON_PERSON_ERFASSER", "FK_KON_PERSON_GRUPPE_BEAUFTRAGT",
                "FK_KON_PERSON_BEAUFTRAGT", "FK_STD_TSK_STATUS", "FK_STD_TSK_TYPE",
                "BESCHREIBUNG_NAECHSTER_TERMIN", "DATUM_BEGONNEN", "DATUM_ERLEDIGT",
                "FK_STD_TSK_SUB_TYPE", "FILE_CONTENT", "FK_TSK_APP_ID", "FK_TSK_APP_PAGE_ID",
                "CREATED_BY", "MODIFIED_BY", "FK_VER_VERTRAG", "CREATED_AT", "MODIFIED_AT"
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
                NOW(), NOW()
            )
            RETURNING *;`,
            [
                data.FK_MDT_MANDANT,
                data.TASK,
                data.DESCR,
                data.COMM,
                data.DATUM_FAELLIGKEIT,
                data.FK_KON_PERSON_ERFASSER,
                data.FK_KON_PERSON_GRUPPE_BEAUFTRAGT,
                data.FK_KON_PERSON_BEAUFTRAGT,
                data.FK_STD_TSK_STATUS,
                data.FK_STD_TSK_TYPE,
                data.BESCHREIBUNG_NAECHSTER_TERMIN,
                data.DATUM_BEGONNEN,
                data.DATUM_ERLEDIGT,
                data.FK_STD_TSK_SUB_TYPE,
                data.FILE_CONTENT,
                data.FK_TSK_APP_ID,
                data.FK_TSK_APP_PAGE_ID,
                data.CREATED_BY,
                data.MODIFIED_BY,
                data.FK_VER_VERTRAG
            ]
        );

 console.log( result.rows[0].PK_TSK_TASK);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to create task",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.post("/wahl/kandidaten/insert", async (req, res) => {
    try {
        const data = req.body;

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_WAHL_KANDIDATEN" (
                "FK_WAHL_WAHL", "FK_WAHL_PARTEI", "CREATED_BY", "MODIFIED_BY",
                "FK_KON_PERSON", "FK_ADR_ORT", "PARTEI_LANG", "PLATZ",
                "VORNAME", "NACHNAME", "ORT", "LANDKREIS", "COMM",
                "FK_WAHL_STIMM_BEZIRK", "FK_MDT_MANDANT", "LANDESVERBAND",
                "KREISVERBAND", "STADTVERBAND", "LINK_WEBSEITE_PERSON",
                "FK_WAHL_VERBAND_LAND", "FK_WAHL_VERBAND_KREIS",
                "FK_WAHL_VERBAND_STADT", "BERUF", "GEBURTSJAHR",
                "BESCHREIBUNG", "BERUF_ALLG", "OK_DATUM", "VORSITZENDER",
                "FK_ADR_PLZ_ORT", "POSITION_NEW", "AUSSCHUSS_NEW",
                "AUSSCHUSS_OLD", "POSITION_OLD", "KREISVORSTAND_POSITION_OLD",
                "ERG_MANDAT", "ERG_ANZ_STIMMEN", "ERG_PROZENT",
                "ERG_ANZ_STIMMEN_BRIEF", "ERG_PROZENT_BRIEF",
                "ERG_ANZ_STIMMEN_URNE", "ERG_PROZENT_URNE",
                "FK_STD_KAND_WAHL_ERG_TYPE",
                "FK_STD_WAHL_KAND_FRAKTIONS_TYPE",
                "EXTERNAL_NR", "SPITZENKANDIDAT",
                "eingetreten_am", "ausgetreten_am",
                "fk_wahl_kandidaten_nachfolger", "ausgeschieden",
                "EMAIL", "FK_WAHL_STIMM_KREIS", "FK_WAHL_LANDESLISTE",
                "LFD_NR", "DATUM_VERAENDERUNG", "VERAENDERUNG",
                "FK_STD_WAHL_KANDIDAT_ART_DER_VERAENDERUNG",
                "Vorgeschlagen durch", "ERGEBNIS", "Kanzlerkandidat",
                "wahl", "partei", "mandant", "FLG_PERSON_UNBEKANNT",
                "FLG_FRAGLICH", "COMM_FRAGLICH", "unternehmen",
                "fk_wahl_stimm_zettel", "ZYKLUS", "LFD_NR1",
                "EXTERNE_PERSON_NR", """FK_ADR_REGION2",
                "CREATED_AT", "MODIFIED_AT"
            )
            VALUES (
                ${Array.from({ length: 75 }, (_, i) => `$${i + 1}`).join(", ")},
                NOW(), NOW()
            )
            RETURNING *;`,
            Object.values(data)
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to insert kandidat",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.put("/wahl_kandidaten/update/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;

        // 1. Load valid columns from DB
        const colResult = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'COMPANY'
              AND table_name = 'T_WAHL_KANDIDATEN';
        `);

        const validColumns = colResult.rows.map(r => r.column_name);

        // 2. Filter incoming fields
        const filteredEntries = Object.entries(data).filter(([key]) =>
            validColumns.includes(key)
        );

        if (filteredEntries.length === 0) {
            return res.status(400).json({ error: "No valid fields to update" });
        }

        // 3. Build SQL
        const setClauses = filteredEntries.map(([key], idx) =>
            `"${key}" = $${idx + 1}`
        );

        setClauses.push(`"MODIFIED_AT" = NOW()`);

        const values = filteredEntries.map(([_, value]) => value);

        const sql = `
            UPDATE "COMPANY"."T_WAHL_KANDIDATEN"
            SET ${setClauses.join(", ")}
            WHERE "PK_WAHL_KANDIDATEN" = $${values.length + 1}
            RETURNING *;
        `;

        const result = await pool.query(sql, [...values, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Kandidat not found" });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ error: "Failed to update kandidat" });
    }
});





app.delete("/wahl/kandidaten/delete/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const result = await pool.query(
            `DELETE FROM "COMPANY"."T_WAHL_KANDIDATEN"
             WHERE "PK_WAHL_KANDIDATEN" = $1
             RETURNING *;`,
            [id]
        );

        res.status(200).json({
            deleted: result.rows[0] || null
        });
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to delete kandidat",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});



app.put("/tasks/update/:id", async (req, res) => {
    try {
        const data = req.body;

        const result = await pool.query(
            `UPDATE "COMPANY"."T_TSK_TASK"
             SET
                "FK_MDT_MANDANT" = $1,
                "TASK" = $2,
                "DESCR" = $3,
                "COMM" = $4,
                "DATUM_FAELLIGKEIT" = $5,
                "FK_KON_PERSON_ERFASSER" = $6,
                "FK_KON_PERSON_GRUPPE_BEAUFTRAGT" = $7,
                "FK_KON_PERSON_BEAUFTRAGT" = $8,
                "FK_STD_TSK_STATUS" = $9,
                "FK_STD_TSK_TYPE" = $10,
                "BESCHREIBUNG_NAECHSTER_TERMIN" = $11,
                "DATUM_BEGONNEN" = $12,
                "DATUM_ERLEDIGT" = $13,
                "FK_STD_TSK_SUB_TYPE" = $14,
                "FILE_CONTENT" = $15,
                "FK_TSK_APP_ID" = $16,
                "FK_TSK_APP_PAGE_ID" = $17,
                "CREATED_BY" = $18,
                "MODIFIED_BY" = $19,
                "FK_VER_VERTRAG" = $20,
                "MODIFIED_AT" = NOW()
             WHERE "PK_TSK_TASK" = $21
             RETURNING *;`,
            [
                data.FK_MDT_MANDANT,
                data.TASK,
                data.DESCR,
                data.COMM,
                data.DATUM_FAELLIGKEIT,
                data.FK_KON_PERSON_ERFASSER,
                data.FK_KON_PERSON_GRUPPE_BEAUFTRAGT,
                data.FK_KON_PERSON_BEAUFTRAGT,
                data.FK_STD_TSK_STATUS,
                data.FK_STD_TSK_TYPE,
                data.BESCHREIBUNG_NAECHSTER_TERMIN,
                data.DATUM_BEGONNEN,
                data.DATUM_ERLEDIGT,
                data.FK_STD_TSK_SUB_TYPE,
                data.FILE_CONTENT,
                data.FK_TSK_APP_ID,
                data.FK_TSK_APP_PAGE_ID,
                data.CREATED_BY,
                data.MODIFIED_BY,
                data.FK_VER_VERTRAG,
                req.params.id
            ]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to update task",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.delete("/tasks/delete/:id", async (req, res) => {
    try {
        await pool.query(
            `DELETE FROM "COMPANY"."T_TSK_TASK" WHERE "PK_TSK_TASK" = $1`,
            [req.params.id]
        );

        res.json({ deleted: true });
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to delete task",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});



//1 -  Get all accounts
app.get("/zoll_list_user_tables", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   table_name
                    FROM 
                     information_schema.tables where table_name like 'T_ZOLL%'
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/kfz_kennzeichen", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                     "COMPANY"."T_CAR_AUTO_KENNZEICHEN"
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/lehrgang", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                     "COMPANY"."T_LEHR_LEHRGANG"
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/wahlraeume", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
    wahl.*,
    loc."PK_LOC_LOCATION" AS loc_PK_LOC_LOCATION,
    loc."LOCATION" AS loc_LOCATION,
    loc."FK_BAS_LOC_LOCATION_TYPE" AS loc_FK_BAS_LOC_LOCATION_TYPE,
    loc."FK_ADR_ADRESSE" AS loc_FK_ADR_ADRESSE,
    loc."CREATED_BY" AS loc_CREATED_BY,
    loc."CREATED_AT" AS loc_CREATED_AT,
    loc."MODIFIED_BY" AS loc_MODIFIED_BY,
    loc."MODIFIED_AT" AS loc_MODIFIED_AT,
    loc."LOCATION_TYPE" AS loc_LOCATION_TYPE,
    loc."location_type_1" AS loc_LOCATION_TYPE1,
    loc."STRASSE" AS loc_STRASSE,
    loc."HSNR" AS loc_HSNR,
    loc."BESCHREIBUNG" AS loc_BESCHREIBUNG,
    loc."COMM" AS loc_COMM,
    loc."POSTFACH" AS loc_POSTFACH,
    loc."PLZ" AS loc_PLZ,
    loc."ORT" AS loc_ORT,
    loc."LAND" AS loc_LAND,
    loc."ADR" AS loc_ADR,
    loc."PK_ADR_LAND" AS loc_PK_ADR_LAND,
    loc."PK_ADR_ORT" AS loc_PK_ADR_ORT,
    loc."PK_ADR_PLZ_ORT" AS loc_PK_ADR_PLZ_ORT,
    loc."PK_BAS_LOC_LOCATION_TYPE" AS loc_PK_BAS_LOC_LOCATION_TYPE,
    loc."FK_MDT_MANDANT" AS loc_FK_MDT_MANDANT,
    loc1."PK_LOC_LOCATION" AS loc1_PK_LOC_LOCATION,
    loc1."LOCATION" AS loc1_LOCATION,
    loc1."FK_BAS_LOC_LOCATION_TYPE" AS loc1_FK_BAS_LOC_LOCATION_TYPE,
    loc1."FK_ADR_ADRESSE" AS loc1_FK_ADR_ADRESSE,
    loc1."CREATED_BY" AS loc1_CREATED_BY,
    loc1."CREATED_AT" AS loc1_CREATED_AT,
    loc1."MODIFIED_BY" AS loc1_MODIFIED_BY,
    loc1."MODIFIED_AT" AS loc1_MODIFIED_AT,
    loc1."LOCATION_TYPE" AS loc1_LOCATION_TYPE,
    loc1."location_type_1" AS loc1_LOCATION_TYPE1,
    loc1."STRASSE" AS loc1_STRASSE,
    loc1."HSNR" AS loc1_HSNR,
   loc1."BESCHREIBUNG" AS loc1_BESCHREIBUNG,
    loc1."COMM" AS loc1_COMM,
  loc1."POSTFACH" AS loc1_POSTFACH,
    loc1."PLZ" AS loc1_PLZ,
    loc1."ORT" AS loc1_ORT,
   loc1."LAND" AS loc1_LAND,
    loc1."ADR" AS loc1_ADR,
    loc1."PK_ADR_LAND" AS loc1_PK_ADR_LAND,
   loc1."PK_ADR_ORT" AS loc1_PK_ADR_ORT,
    loc1."PK_ADR_PLZ_ORT" AS loc1_PK_ADR_PLZ_ORT,
    loc1."PK_BAS_LOC_LOCATION_TYPE" AS loc1_PK_BAS_LOC_LOCATION_TYPE,
   loc1."FK_MDT_MANDANT" AS loc1_FK_MDT_MANDANT

FROM 
    "COMPANY"."T_WAHL_WAHLRAUM" wahl
LEFT JOIN 
    "COMPANY"."V_LOC_LOCATION" loc 
ON 
    wahl."FK_LOC_LOCATION" = loc."PK_LOC_LOCATION"
LEFT JOIN 
    "COMPANY"."V_LOC_LOCATION" loc1 
ON 
    wahl."FK_LOC_LOCATION_1" = loc1."PK_LOC_LOCATION"
                      
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

//1 -  Get all accounts
app.get("/belege", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                   *

                    FROM 
                        "COMPANY"."V_INP_BELEGE_ALL1" 
                   ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts with pagination
app.get("/belege1", async (req, res) => {
    try {
        // Get pagination parameters from query string, with defaults
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        
        // Calculate offset for pagination
        const offset = (page - 1) * pageSize;
        
        // Get total count of records for pagination metadata
        const countQuery = `SELECT COUNT(*) FROM "COMPANY"."V_INP_BELEGE_ALL1"`;
        const countResult = await pool.query(countQuery);
        const totalCount = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalCount / pageSize);

        // Get paginated data
        const result = await pool.query(
            `SELECT * FROM "COMPANY"."V_INP_BELEGE_ALL1" 
             ORDER BY "BELEGDATUM"  -- You should specify an ORDER BY for consistent pagination
             LIMIT $1 OFFSET $2`,
            [pageSize, offset]
        );
        
        res.json({
            data: result.rows,
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/inventare", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."V_INV_INVENTARE_1" 
                   
		;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/tables", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT  inf.tables_schema || inf.table_name name, inf.*

                    FROM 
                       information_schema.tables inf
                   
		;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all tables for a specific schema
app.get("/tables/:schema", async (req, res) => {
    const { schema } = req.params;
    
    console.log(`Received request for schema: ${schema}`); // Debug log

    // Validate schema name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
        console.error(`Invalid schema name format: ${schema}`);
        return res.status(400).json({ 
            success: false,
            error: "Invalid schema name format",
            message: "Schema name can only contain letters, numbers and underscores, and must start with a letter or underscore"
        });
    }

    try {
        console.log(`Querying tables for schema: ${schema}`); // Debug log
        
        const result = await pool.query(`
            SELECT 
                table_name,
                table_type,
                is_insertable_into,
                COALESCE(obj_description((table_schema || '.' || table_name)::regclass::oid, 'pg_class'), '') as table_comment,
                table_schema
            FROM 
                information_schema.tables
            WHERE 
                table_schema = $1
                AND table_schema NOT IN ('pg_catalog', 'information_schema')
                AND table_schema NOT LIKE 'pg_%'
            ORDER BY 
                table_name ASC
        `, [schema]);

        console.log(`Found ${result.rowCount} tables in schema ${schema}`); // Debug log

        if (result.rows.length === 0) {
            console.warn(`No tables found in schema: ${schema}`);
            return res.status(404).json({
                success: false,
                error: "No tables found",
                message: `No tables found in schema '${schema}' or schema doesn't exist`,
                schema: schema,
                suggestion: "Check the schema name or try listing all schemas first"
            });
        }

        res.json({
            success: true,
            schema: schema,
            count: result.rowCount,
            tables: result.rows.map(table => ({
                name: table.table_name,
                type: table.table_type,
                isInsertable: table.is_insertable_into === 'YES',
                comment: table.table_comment,
                fullName: `${table.table_schema}.${table.table_name}`
            }))
        });
        
    } catch (error) {
        console.error(`Database error for schema ${schema}:`, error);
        res.status(500).json({ 
            success: false,
            error: "Database operation failed",
            message: "Could not retrieve tables from the database",
            schema: schema,
            details: {
                errorMessage: error.message,
                errorCode: error.code,
                ...(process.env.NODE_ENV === "development" && {
                    stack: error.stack,
                    hint: "Check database connection, schema permissions, and table existence"
                })
            }
        });
    }
});
// Get all accounts
app.get("/persons", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."T_KON_PERSON" 
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/persons/bild", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."V_KON_PERSON_BILD" 
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Get all accounts
app.get("/work", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."T_WORK_IN_BEARBEITUNG" 
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Get all accounts
app.get("/adresse", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."V_ADR_ADRESSE" 
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Get PLZ/Ort combinations with optional FK_ADR_ORT filter
app.get("/plz_ort", async (req, res) => {
    try {
        const { FK_ADR_ORT } = req.query;
        let query;
        let params = [];

        if (FK_ADR_ORT) {
            // Query with FK_ADR_ORT parameter
            query = `
                SELECT *
                FROM "COMPANY"."T_ADR_PLZ_ORT"
                WHERE "FK_ADR_ORT" = $1
                ORDER BY "PLZ"`;
            params = [FK_ADR_ORT];
        } else {
            // Query without FK_ADR_ORT parameter (get all)
            query = `
                SELECT *
                FROM "COMPANY"."T_ADR_PLZ_ORT"
                ORDER BY "PLZ", "FK_ADR_ORT"`;
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch PLZ/Ort combinations",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/land", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."V_ADR_LAND" 
  ORDER BY "LAND"
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/location_type", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."T_BAS_LOC_LOCATION_TYPE" 
                  order by "LOCATION_TYPE"
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/routing", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT   *
                    FROM 
                        "COMPANY"."V_ROUT_ROUTING" 
order by "SORT_NR"
             
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/berufe", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT   *
                    FROM 
                        "COMPANY"."T_WORK_BERUF" 

             
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.post("/berufe/insert", async (req, res) => {
  try {
    const {
      FK_MDT_MANDANT,
      BERUF,
      DESCR,
      COMM,
      CREATED_BY,
      BERUF_MAENNLICH,
      BERUF_WEIBLICH,
      checked,
      BERUF_ENG,
      FK_WORK_BERUF_PRODUKT
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO  "COMPANY"."T_WORK_BERUF" (
        "FK_MDT_MANDANT", "CREATED_AT", "BERUF", "DESCR", "COMM",
        "CREATED_BY", "BERUF_MAENNLICH", "BERUF_WEIBLICH", "checked",
        "BERUF_ENG", "FK_WORK_BERUF_PRODUKT"
      )
      VALUES (
        $1, NOW(), $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10
      )
      RETURNING *;
      `,
      [
        FK_MDT_MANDANT,
        BERUF,
        DESCR,
        COMM,
        CREATED_BY,
        BERUF_MAENNLICH,
        BERUF_WEIBLICH,
        checked,
        BERUF_ENG,
        FK_WORK_BERUF_PRODUKT
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/berufe/update/:id", async (req, res) => {
  try {
    const {
      FK_MDT_MANDANT,
      BERUF,
      DESCR,
      COMM,
      MODIFIED_BY,
      BERUF_MAENNLICH,
      BERUF_WEIBLICH,
      checked,
      BERUF_ENG,
      FK_WORK_BERUF_PRODUKT
    } = req.body;

    const result = await pool.query(
      `
      UPDATE  "COMPANY"."T_WORK_BERUF"
      SET
        "FK_MDT_MANDANT" = $1,
        "MODIFIED_AT" = NOW(),
        "BERUF" = $2,
        "DESCR" = $3,
        "COMM" = $4,
        "MODIFIED_BY" = $5,
        "BERUF_MAENNLICH" = $6,
        "BERUF_WEIBLICH" = $7,
        "checked" = $8,
        "BERUF_ENG" = $9,
        "FK_WORK_BERUF_PRODUKT" = $10
      WHERE "PK_WORK_BERUF" = $11
      RETURNING *;
      `,
      [
        FK_MDT_MANDANT,
        BERUF,
        DESCR,
        COMM,
        MODIFIED_BY,
        BERUF_MAENNLICH,
        BERUF_WEIBLICH,
        checked,
        BERUF_ENG,
        FK_WORK_BERUF_PRODUKT,
        req.params.id
      ]
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/berufe/delete/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM "COMPANY"."T_WORK_BERUF" WHERE "PK_WORK_BERUF" = $1 RETURNING *`,
      [req.params.id]
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});





// Get all ORT or filter by FK_ADR_LAND
app.get("/ort", async (req, res) => {
    try {
        const { FK_ADR_LAND } = req.query;

        const baseQuery = `
            SELECT *
            FROM "COMPANY"."T_ADR_ORT" ort
            left join "COMPANY"."T_ADR_LAND" la on ort."FK_ADR_LAND" = la."PK_ADR_LAND"
        `;

        const whereClause = FK_ADR_LAND
            ? `WHERE "FK_ADR_LAND" = $1 
        `
            : "";
        const orderByClause =  ` ORDER BY "LAND", "ORT"`

        const finalQuery = `${baseQuery} ${whereClause} ${orderByClause};`;

        const result = FK_ADR_LAND
            ? await pool.query(finalQuery, [FK_ADR_LAND])
            : await pool.query(finalQuery);

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to fetch ORT data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});



// Get all accounts
app.get("/location", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."V_LOC_LOCATION" 
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/vorsteuer", async (req, res) => {
    try {
        const result = await pool.query(
            `      select coalesce(quart."JAHR", mon."JAHR") jahr,
              quart."QUARTAL",
              mon."MONAT",
              coalesce('Q'|| quart."QUARTAL", 'M' || mon."MONAT") sec,
              vor.*
            from "COMPANY"."T_STEU_STEUER_VORANMLDG" vor
              left join "COMPANY"."T_STEU_STEUER_MONAT" mon on mon."PK_STEU_STEUER_MONAT" = vor."FK_STEU_STEUER_MONAT"
              left join "COMPANY"."T_STEU_STEUER_QUARTAL" quart on quart."PK_STEU_STEUER_QUARTAL" = vor."FK_STEU_STEUER_QUARTAL"
            
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/Flug_Airports", async (req, res) => {
    try {
        const result = await pool.query(
            `      select *
              
            from "COMPANY"."T_FLI_AIR_AIRPORTS" 
            
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/steuer_erkl", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."T_STEU_STEUER_ERKLAERUNG" 
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/org_unit_tree", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."V_REL_ORG_ORG_UNIT_TREE2"
  order by "MAIN_ORG_UNIT_NAME"
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/views", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        information_schema."views" 
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/person_beruf/:id", async (req, res) => {
    try {
 const { id } = req.params;
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."T_REL_KON_PERSON_BERUF" relber 
                         LEFT JOIN "COMPANY"."T_WORK_BERUF" ber on relber."FK_WORK_BERUF" = ber."PK_WORK_BERUF"
                    where "FK_KON_PERSON" = $1
                     
                    ;`,[id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/rel_person_beruf", async (req, res) => {
    try {

        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."T_REL_KON_PERSON_BERUF" relber 
                         LEFT JOIN "COMPANY"."T_WORK_BERUF" ber on relber."FK_WORK_BERUF" = ber."PK_WORK_BERUF"
                  
                     
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/person_wohnort/:id", async (req, res) => {
    try {
 const { id } = req.params;
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."T_REL_KON_PERSON_WOHNORT" relber 
                         LEFT JOIN "COMPANY"."V_ADR_ORT" ber on relber."FK_ADR_WOHNORT" = ber."PK_ADR_ORT"
                    where "FK_KON_PERSON" = $1
                     
                    ;`,[id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/person_bild/:id", async (req, res) => {
    try {
 const { id } = req.params;
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."T_REL_KON_PERSON_BILD" relber 
                     left join "COMPANY"."T_KON_PERSON" pers on relber."FK_KON_PERSON" = pers."PK_KON_PERSON"
                         
                    where "FK_BILD_BILDER" = $1
                     
                    ;`,[id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/rel_kontenplan_konten/:id", async (req, res) => {
    try {
 const { id } = req.params;
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."T_REL_LEX_KONTENPLAN_KTO_KTO_KAT" relber 
                
                         
                    where "FK_LEX_KONTENPLAN_KONTEN_KAT" = $1
                     
                    ;`,[id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/kontenplan_konten/:id", async (req, res) => {
    try {
 const { id } = req.params;
        const result = await pool.query(
            `SELECT 
                   *
                    FROM 
                        "COMPANY"."T_LEX_KONTENPLAN_KONTEN" relber 
                
                         
                    where "PK_LEX_KONTENPLAN_KONTEN" = $1
                     
                    ;`,[id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Delete a specific Work in Bearbeitung record by ID
app.delete("/work/delete/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "ID parameter is required" });
    }

    try {  

        // Perform the deletion
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_WORK_IN_BEARBEITUNG" WHERE "PK_WORK_IN_BEARBEITUNG" = $1 RETURNING *`,
            [id]
        );

        res.json({
            message: "Record deleted successfully",
            deletedRecord: deleteResult.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to delete record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

// Delete a specific Work in Bearbeitung record by ID
app.delete("/person_group_rel/delete/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "ID parameter is required" });
    }

    try {  

        // Perform the deletion
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_REL_KON_PERSON_PERSON_GROUP" WHERE "PK_REL_KON_PERSON_PERSON_GROUP" = $1 RETURNING *`,
            [id]
        );

        res.json({
            message: "Record deleted successfully",
            deletedRecord: deleteResult.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to delete record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});


// Delete a specific Work in Bearbeitung record by ID
app.delete("/girokonto/delete/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "ID parameter is required" });
    }

    try {  

        // Perform the deletion
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_KTO_GIROKONTO" WHERE "FK_MAIN_KEY" = $1 RETURNING *`,
            [id]
        );

        res.json({
            message: "Record deleted successfully",
            deletedRecord: deleteResult.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to delete record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});



// Delete a specific Work in Bearbeitung record by ID
app.delete("/kreditkarte/delete/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "ID parameter is required" });
    }

    try {  

        // Perform the deletion
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_KTO_KREDITKARTE" WHERE "FK_MAIN_KEY" = $1 RETURNING *`,
            [id]
        );

        res.json({
            message: "Record deleted successfully",
            deletedRecord: deleteResult.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to delete record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

// Delete a specific Work in Bearbeitung record by ID
app.delete("/PAYPAL/delete/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "ID parameter is required" });
    }

    try {  

        // Perform the deletion
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_KTO_PAYPAL" WHERE "FK_MAIN_KEY" = $1 RETURNING *`,
            [id]);
const deleteResult1 = await pool.query(
            `DELETE FROM "COMPANY"."T_KTO_PAYPAL_ABGL_ZAHLUNGEN" WHERE "FK_MAIN_KEY" = $1 RETURNING *`,
            [id]);
const deleteResult2 = await pool.query(
            `DELETE FROM "COMPANY"."T_KTO_PAYPAL_GUTHABEN_RELEVANT" WHERE "FK_MAIN_KEY" = $1 RETURNING *`,
            [id]);
       

        res.json({
            message: "Record deleted successfully",
            deletedRecord: deleteResult.rows[0],
deletedRecord: deleteResult1.rows[0],
deletedRecord: deleteResult2.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to delete record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

// Delete a specific Work in Bearbeitung record by ID
app.delete("/beleg/delete/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "ID parameter is required" });
    }

    try {  

        // Perform the deletion
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_INP_BELEGE_ALL" WHERE "PK_INP_BELEGE_ALL" = $1 RETURNING *`,
            [id]
        );

        res.json({
            message: "Record deleted successfully",
            deletedRecord: deleteResult.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to delete record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

// Delete a specific Work in Bearbeitung record by ID
app.delete("/beleg_pos/delete/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "ID parameter is required" });
    }

    try {  

        // Perform the deletion
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_INP_BELEGE_POS_ALL" WHERE "PK_INP_BELEGE_POS_ALL" = $1 RETURNING *`,
            [id]
        );

        res.json({
            message: "Record deleted successfully",
            deletedRecord: deleteResult.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to delete record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

// Delete a specific Work in Bearbeitung record by ID
app.delete("/person/delete/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "ID parameter is required" });
    }

    try {  

        // Perform the deletion
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_KON_PERSON" WHERE "PK_KON_PERSON" = $1 RETURNING *`,
            [id]
        );

        res.json({
            message: "Record deleted successfully",
            deletedRecord: deleteResult.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to delete record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

// Delete a specific Work in Bearbeitung record by ID
app.delete("/bild/delete/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "ID parameter is required" });
    }

    try {  

        // Perform the deletion
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_BILD_BILDER" WHERE "PK_BILD_BILDER" = $1 RETURNING *`,
            [id]
        );

        res.json({
            message: "Record deleted successfully",
            deletedRecord: deleteResult.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to delete record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});


// Delete a specific rel bild record by ID
app.delete("/rel_inp_bild_delete/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "ID parameter is required" });
    }

    try {  

  

        // Perform the deletion
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_REL_INP_INP_BELEGE_ALL_BILD_BILDER" WHERE "PK_REL_INP_INP_BELEGE_ALL_BILD_BILDER" = $1 RETURNING *`,
            [id]
        );

        res.json({
            message: "Record deleted successfully",
            deletedRecord: deleteResult.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to delete record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});


app.delete("/rel_person_bild_delete/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "ID parameter is required" });
    }

    try {  

  

        // Perform the deletion
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_REL_KON_PERSON_BILD" WHERE "PK_REL_KON_PERSON_BILD" = $1 RETURNING *`,
            [id]
        );

        res.json({
            message: "Record deleted successfully",
            deletedRecord: deleteResult.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to delete record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});


// Delete a specific AHN record by ID
app.delete("/work/delete/:id", async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "ID parameter is required" });
    }

    try {
      

  

        // Perform the deletion
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_WORK_IN_BEARBEITUNG" WHERE "PK_WORK_IN_BEARBEITUNG" = $1 RETURNING *`,
            [id]
        );

        res.json({
            message: "Record deleted successfully",
            deletedRecord: deleteResult.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to delete record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

// Get all accounts
app.get("/ahn", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *
                    FROM 
                        "COMPANY"."T_AHN_AHNENTAFEL" 
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/verpackungstyp", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
    pkg.*,
    std1."PK_STD" AS "STD1_PK_STD", std1."STD_NAME" AS "STD1_NAME", std1."STD_VALUE" AS "STD1_VALUE",
    std2."PK_STD" AS "STD2_PK_STD", std2."STD_NAME" AS "STD2_NAME", std2."STD_VALUE" AS "STD2_VALUE",
    std3."PK_STD" AS "STD3_PK_STD", std3."STD_NAME" AS "STD3_NAME", std3."STD_VALUE" AS "STD3_VALUE",
    std4."PK_STD" AS "STD4_PK_STD", std4."STD_NAME" AS "STD4_NAME", std4."STD_VALUE" AS "STD4_VALUE",
    std5."PK_STD" AS "STD5_PK_STD", std5."STD_NAME" AS "STD5_NAME", std5."STD_VALUE" AS "STD5_VALUE",
    std6."PK_STD" AS "STD6_PK_STD", std6."STD_NAME" AS "STD6_NAME", std6."STD_VALUE" AS "STD6_VALUE",
    std7."PK_STD" AS "STD7_PK_STD", std7."STD_NAME" AS "STD7_NAME", std7."STD_VALUE" AS "STD7_VALUE",
    std8."PK_STD" AS "STD8_PK_STD", std8."STD_NAME" AS "STD8_NAME", std8."STD_VALUE" AS "STD8_VALUE",
    std9."PK_STD" AS "STD9_PK_STD", std9."STD_NAME" AS "STD9_NAME", std9."STD_VALUE" AS "STD9_VALUE",
    std10."PK_STD" AS "STD10_PK_STD", std10."STD_NAME" AS "STD10_NAME", std10."STD_VALUE" AS "STD10_VALUE",
    std11."PK_STD" AS "STD11_PK_STD", std11."STD_NAME" AS "STD11_NAME", std11."STD_VALUE" AS "STD11_VALUE",
    std12."PK_STD" AS "STD12_PK_STD", std12."STD_NAME" AS "STD12_NAME", std12."STD_VALUE" AS "STD12_VALUE",
    std13."PK_STD" AS "STD13_PK_STD", std13."STD_NAME" AS "STD13_NAME", std13."STD_VALUE" AS "STD13_VALUE",
 std14."PK_STD" AS "STD14_PK_STD", std14."STD_NAME" AS "STD14_NAME", std14."STD_VALUE" AS "STD14_VALUE",
 std15."PK_STD" AS "STD15_PK_STD", std15."STD_NAME" AS "STD15_NAME", std15."STD_VALUE" AS "STD15_VALUE",
    pkg2."PK_BAS_WH_PKG_PACKUNGSTYP" pkg2_PK_BAS_WH_PKG_PACKUNGSTYP,
    pkg2."PACKUNGSTYP" pkg2_PACKUNGSTYP
FROM 
    "COMPANY"."T_BAS_WH_PKG_PACKUNGSTYP" pkg
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 28) std1  ON std1."STD_VALUE"::bigint = pkg."FK_STD_MAT_MATERIAL"  
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 29) std2 ON std2."STD_VALUE"::bigint = pkg."FK_STD_GR_GROESSE" 
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 30) std3 ON std3."STD_VALUE"::bigint = pkg."FK_STD_VER_VERPACKUNG_EIGENSCHAFT" 
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 31) std4 ON std4."STD_VALUE"::bigint = pkg."FK_STD_WH_PKG_VERPACKUNGSGRUPPE"
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 32) std5 ON std5."STD_VALUE"::bigint = pkg."FK_STD_SCH_SCHUTZSTUFE"
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 33) std6 ON std6."STD_VALUE"::bigint = pkg."FK_STD_PKG_BUENDELUNG"
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 34) std7 ON std7."STD_VALUE"::bigint = pkg."FK_STD_PKG_FORM"
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 35) std8 ON std8."STD_VALUE"::bigint = pkg."FK_STD_PKG_FESTIGKEIT"
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 36) std9 ON std9."STD_VALUE"::bigint = pkg."FK_STD_PKG_DECKEL"
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 37) std10 ON std10."STD_VALUE"::bigint = pkg."FK_STD_PKG_HENKEL"
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 38) std11 ON std11."STD_VALUE"::bigint = pkg."FK_STD_PKG_AUSGUSS"
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 39) std12 ON std12."STD_VALUE"::bigint = pkg."FK_STD_PKG_WASSERRESISTENT"
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 40) std14 ON std14."STD_VALUE"::bigint = pkg."FK_STD_PKG_AUSKLEIDUNG"
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 42) std15 ON std15."STD_VALUE"::bigint = pkg."FK_STD_PKG_BESCHICHTUNG"
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = 28) std13 
    ON std13."STD_VALUE"::bigint IN (
        SELECT trim(value)::bigint 
        FROM unnest(string_to_array(pkg."FK_STD_MAT_MATERIAL_LIST", ';')) AS value
    )
LEFT JOIN 
    (SELECT * FROM "COMPANY"."T_BAS_WH_PKG_PACKUNGSTYP") pkg2 
    ON pkg2."PK_BAS_WH_PKG_PACKUNGSTYP"::bigint IN (
        SELECT trim(value)::bigint 
        FROM unnest(string_to_array(pkg."ZUSAMMENGESETZTE_VERPACKUNGEN", ';')) AS value
    )
      
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});




// Get all accounts
app.get("/std_group", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *
                    FROM 
                        "COMPANY"."T_STD_GROUP" 
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/cnt_images", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        count(*)

                    FROM 
                        "COMPANY"."IMP_IMAGES" 
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/adr_adresse_schnell", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                       adrs.*,
                       loc."PK_LOC_LOCATION",
                       loc."LOCATION",
                       loc."FK_BAS_LOC_LOCATION_TYPE",
                       adr."PK_ADR_ADRESSE",
                       vadr."LAND" ||' '|| vadr."ORT" ||' '|| coalesce(vadr."PLZ",'') ||' '|| coalesce(vadr."STRASSE",'') ||' '|| coalesce(vadr."HSNR",'') adr

                    FROM 
                        "COMPANY"."T_ADR_ADRESSE_SCHNELL" adrs
                      left join "COMPANY"."T_LOC_LOCATION" loc on loc."PK_LOC_LOCATION" = adrs."FK_LOC_LOCATION"
                      left join "COMPANY"."T_ADR_ADRESSE" adr on adr."PK_ADR_ADRESSE" = adrs."FK_ADR_ADRESSE"
                      left join "COMPANY"."V_ADR_ADRESSE" vadr on vadr."PK_ADR_ADRESSE" = adrs."FK_ADR_ADRESSE"
                          
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/images", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        id

                    FROM 
                        "COMPANY"."IMP_IMAGES" 
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/imp_lex_office", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."T_IMP_LEX_OFFICE_BUCHUNGEN" 
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts
app.get("/regions", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        *

                    FROM 
                        "COMPANY"."V_ADR_REGION" reg
               
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/geschaeftspartner_kontakt_rel", async (req, res) => {
    try {
        const { 
 id,
            fk_kon_person,
            fk_org_org_unit ,
pk_inp_belege_all,
fk_kon_geschaeftspartner
        } = req.query;
        
        let query = `
            SELECT 
                *
            FROM 
                "COMPANY"."V_REL_KON_GESCHAEFTSPARTNER_KONTAKT" reg
        `;
        
        let queryParams = [];
        let whereConditions = [];
        let paramCount = 0;
        
        // Filter by person ID if provided
        if (id) {
            paramCount++;
            whereConditions.push(`reg."FK_REL_KON_GESCHAEFTSPARTNER_KONTAKT" = $${paramCount}`);
            queryParams.push(id);
        }

 // Filter by person ID if provided
        if (fk_kon_person) {
            paramCount++;
            whereConditions.push(`reg."PK_KON_PERSON" = $${paramCount}`);
            queryParams.push(fk_kon_person);
        }
        
        
        // Filter by organisation unit ID if provided
        if (fk_org_org_unit) {
            paramCount++;
            whereConditions.push(`reg."PK_ORG_UNIT" = $${paramCount}`);
            queryParams.push(fk_org_org_unit);
        }

    if (pk_inp_belege_all) {
            paramCount++;
            whereConditions.push(`reg."PK_INP_BELEGE_ALL" = $${paramCount}`);
            queryParams.push(pk_inp_belege_all);
        }

 if (fk_kon_geschaeftspartner) {
            paramCount++;
            whereConditions.push(`reg."FK_KON_GESCHAEFTSPARTNER" = $${paramCount}`);
            queryParams.push(fk_kon_geschaeftspartner);
        }
        
        
        
        // Add WHERE clause if any conditions exist
        if (whereConditions.length > 0) {
            query += ` WHERE ${whereConditions.join(' AND ')}`;
        }
        
        query += ` ORDER BY reg."PK_REL_KON_GESCHAEFTSPARTNER_KONTAKT"`;
        
        const result = await pool.query(query, queryParams);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length,
            filters: {
id: id || null,
                fk_kon_person: fk_kon_person || null,
                fk_org_org_unit: fk_org_org_unit || null,
pk_inp_belege_all: pk_inp_belege_all || null,
fk_kon_geschaeftspartner: fk_kon_geschaeftspartner || null
            }
        });
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch geschaeftspartner kontakt relations",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/images/:id1", async (req, res) => {
    try {
        const { id1 } = req.params;
        const result = await pool.query(
            `SELECT * 
             FROM "COMPANY"."IMP_IMAGES"
             WHERE id = $1`,
            [id1]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Image not found" });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch image data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/visit/:id1", async (req, res) => {
    try {
        const { id1 } = req.params;
        const result = await pool.query(
            `SELECT * 
             FROM "COMPANY"."T_BILD_BILDER"
             WHERE "FK_ABL_ORDNER_PAGE" = $1`,
            [id1]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Image not found" });
        }
        
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch image data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/std/:id1", async (req, res) => {
    try {
        const { id1 } = req.params;
        const result = await pool.query(
            `SELECT * 
             FROM "COMPANY"."T_STD"
             WHERE "FK_STD_GROUP" = $1`,
            [id1]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Image not found" });
        }
        
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch image data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/show_table_content/:id1", async (req, res) => {
    try {
        const { id1 } = req.params;
        const result = await pool.query(
            
            `SELECT * FROM "COMPANY"."${id1}"`
        );
        
     
        
   
        
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch image data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/vorsteuer/:id1", async (req, res) => {
    try {
        const { id1 } = req.params;
        const result = await pool.query(
            `SELECT * 
             FROM "COMPANY"."T_STEU_STEUER_VORANMLDG"
             WHERE "PK_STEU_STEUER_VORANMLDG"= $1`,
            [id1]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Image not found" });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch image data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/belege_tabellen/:id1", async (req, res) => {
    try {
        const { id1 } = req.params;
        const result = await pool.query(
            `  SELECT inp."PK_INP_BELEGE_ALL" , "BELEGNUMMER", "BELEGDATUM", "BEZEICHNUNG", "PK_BILD_BILDER", "FILECONTENT", "FILENAME"
             FROM "COMPANY"."T_INP_BELEGE_ALL" inp
                 LEFT JOIN "COMPANY"."T_REL_INP_INP_BELEGE_ALL_BILD_BILDER" rel on rel."FK_INP_BELEGE_ALL" = inp."PK_INP_BELEGE_ALL"
               left join "COMPANY"."T_BILD_BILDER" bild on bild."PK_BILD_BILDER" = rel."FK_BILD_BILDER"
             WHERE "PK_INP_BELEGE_ALL"= $1`,
            [id1]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Image not found" });
        }
        
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch image data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/steuer_erkl/:id1", async (req, res) => {
    try {
        const { id1 } = req.params;
        const result = await pool.query(
            `SELECT * 
             FROM "COMPANY"."T_STEU_STEUER_ERKLAERUNG"
             WHERE "PK_STEU_STEUER_ERKLAERUNG"= $1`,
            [id1]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Image not found" });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch image data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});





app.get("/strasse/hsnr/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `select 

"PK_ADR_ADRESSE",

"PK_REL_ADR_PLZ_STRASSE",
"FK_ADR_ORT" str_fk_adr_ort,
"FK_ADR_STRASSE",
"FK_ADR_PLZ_ORT",
"PK_ADR_PLZ_ORT",

"FK_ADR_ORT",
"PK_ADR_STRASSE",
"PLZ",
"Straße",
"HSNR"


from "COMPANY"."V_ADR_STRASSE"
             WHERE "PK_ADR_ADRESSE" = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Image not found" });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch image data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Insert an image into T_BILD_BILDER table
app.post("/images/insert1", async (req, res) => {
    try {
        const { imageId, description } = req.body;

        if (!imageId) {
            return res.status(400).json({
                error: "imageId is required",
                received: req.body
            });
        }

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_BILD_BILDER" (
                "FILECONTENT", 
                "FILENAME", 
                "KLASSIFIKATION_1", 
                "COMM"
            )
            SELECT 
                data, 
                name, 
                $2, 
                'alt: ' || id  
            FROM "COMPANY"."IMP_IMAGES"
            WHERE id = $1
            RETURNING "PK_BILD_BILDER"`,
            [imageId, description]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "No matching image found",
                details: `No image with id = ${imageId}`
            });
        }

        res.status(201).json({
            success: true,
            imageRecordId: result.rows[0].PK_BILD_BILDER
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert image record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.post("/post/insert", async (req, res) => {
    try {
        const {
            FK_MDT_MANDANT,
            HEADER,
            EINGANGSDATUM_EMAIL,
            EINGANGSDATUM_BRIEF,
            ELEKTRONISCHER_INHALT,
            INHALTSBESCHREIBUNG,
            FK_STD_POST_TYPE,
            FK_STD_POST_STATUS,
            DATUM_ERLEDIGT,
            BRIEF_SEITEN,
            FK_STD_POST_DATEN_ERFASSUNG_STATUS,
            DATENERFASSUNG_FINISHED_DATE,
            FK_KON_PERSON_EMPFAENGER,
            FK_KON_PERSON_SENDER,
            FK_KON_GESCHAEFTSPARTNER_SENDER,
            FK_ORG_UNIT_SENDER,
            FK_ADR_ADRESSE_EMPFAENGER,
            FK_ADR_ADRESSE_SENDER,
            BRIEF_VOM,
            CREATED_BY
        } = req.body;

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_POST_BRIEF_EMAIL" (
                "FK_MDT_MANDANT",
                "CREATED_AT",
                "HEADER",
                "EINGANGSDATUM_EMAIL",
                "EINGANGSDATUM_BRIEF",
                "ELEKTRONISCHER_INHALT",
                "INHALTSBESCHREIBUNG",
                "FK_STD_POST_TYPE",
                "FK_STD_POST_STATUS",
                "DATUM_ERLEDIGT",
                "BRIEF_SEITEN",
                "FK_STD_POST_DATEN_ERFASSUNG_STATUS",
                "DATENERFASSUNG_FINISHED_DATE",
                "FK_KON_PERSON_EMPFAENGER",
                "FK_KON_PERSON_SENDER",
                "FK_KON_GESCHAEFTSPARTNER_SENDER",
                "FK_ORG_UNIT_SENDER",
                "FK_ADR_ADRESSE_EMPFAENGER",
                "FK_ADR_ADRESSE_SENDER",
                "BRIEF_VOM",
                "CREATED_BY"
            )
            VALUES (
                $1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9,
                $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
            )
            RETURNING "PK_POST_BRIEF_EMAIL"`,
            [
                FK_MDT_MANDANT,
                HEADER,
                EINGANGSDATUM_EMAIL,
                EINGANGSDATUM_BRIEF,
                ELEKTRONISCHER_INHALT,
                INHALTSBESCHREIBUNG,
                FK_STD_POST_TYPE,
                FK_STD_POST_STATUS,
                DATUM_ERLEDIGT,
                BRIEF_SEITEN,
                FK_STD_POST_DATEN_ERFASSUNG_STATUS,
                DATENERFASSUNG_FINISHED_DATE,
                FK_KON_PERSON_EMPFAENGER,
                FK_KON_PERSON_SENDER,
                FK_KON_GESCHAEFTSPARTNER_SENDER,
                FK_ORG_UNIT_SENDER,
                FK_ADR_ADRESSE_EMPFAENGER,
                FK_ADR_ADRESSE_SENDER,
                BRIEF_VOM,
                CREATED_BY
            ]
        );

        res.status(201).json({
            success: true,
            id: result.rows[0].PK_POST_BRIEF_EMAIL
        });

    } catch (error) {
        console.error("Insert error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert post record",
            details: error.message
        });
    }
});

app.post("/plzort/insert", async (req, res) => {
    try {
        const {
            PLZ,
            OT,
            FK_ADR_ORT,
            CREATED_BY,
            MODIFIED_BY,
            ZENTRUM,
            POSTLEITZAHL_NUR_POSTFACH,
            VALID,
            VALID_FROM,
            VALID_TO,
            BEMERKUNGEN,
            FK_STD_ADR_ORT_AUSRICHTUNG,
            LNK
        } = req.body;

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_ADR_PLZ_ORT" (
                "PLZ",
                "OT",
                "FK_ADR_ORT",
                "CREATED_BY",
                "CREATED_AT",
                "MODIFIED_BY",
                "MODIFIED_AT",
                "ZENTRUM",
                "POSTLEITZAHL_NUR_POSTFACH",
                "VALID",
                "VALID_FROM",
                "VALID_TO",
                "BEMERKUNGEN",
                "FK_STD_ADR_ORT_AUSRICHTUNG",
                "LNK"
            )
            VALUES (
                $1, $2, $3, $4, NOW(), $5, NOW(),
                $6, $7, $8, $9, $10, $11, $12, $13
            )
            RETURNING "PK_ADR_PLZ_ORT"`,
            [
                PLZ,
                OT,
                FK_ADR_ORT,
                CREATED_BY,
                MODIFIED_BY,
                ZENTRUM,
                POSTLEITZAHL_NUR_POSTFACH,
                VALID,
                VALID_FROM,
                VALID_TO,
                BEMERKUNGEN,
                FK_STD_ADR_ORT_AUSRICHTUNG,
                LNK
            ]
        );

        res.status(201).json({
            success: true,
            id: result.rows[0].PK_ADR_PLZ_ORT
        });

    } catch (error) {
        console.error("Insert error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert PLZ/Ort record",
            details: error.message
        });
    }
});


app.post("/ort/insert", async (req, res) => {
    try {
        const {
            ORT,
            CREATED_BY,
            MODIFIED_BY,
            FK_ADR_LAND,
            ORT_2,
            KOORDINATEN,
            COMM,
            LINK_ORT
        } = req.body;

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_ADR_ORT" (
                "ORT",
                "CREATED_BY",
                "CREATED_AT",
                "MODIFIED_BY",
                "MODIFIED_AT",
                "FK_ADR_LAND",
                "ORT_2",
                "KOORDINATEN",
                "COMM",
                "LINK_ORT"
            )
            VALUES (
                $1, $2, NOW(), $3, NOW(), $4, $5, $6, $7, $8
            )
            RETURNING "PK_ADR_ORT"`,
            [
                ORT,
                CREATED_BY,
                MODIFIED_BY,
                FK_ADR_LAND,
                ORT_2,
                KOORDINATEN,
                COMM,
                LINK_ORT
            ]
        );

        res.status(201).json({
            success: true,
            id: result.rows[0].PK_ADR_ORT
        });

    } catch (error) {
        console.error("Insert error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert ort record",
            details: error.message
        });
    }
});


app.put("/post/update/:id", async (req, res) => {
    try {
        const id = req.params.id;

        const {
            FK_MDT_MANDANT,
            HEADER,
            EINGANGSDATUM_EMAIL,
            EINGANGSDATUM_BRIEF,
            ELEKTRONISCHER_INHALT,
            INHALTSBESCHREIBUNG,
            FK_STD_POST_TYPE,
            FK_STD_POST_STATUS,
            DATUM_ERLEDIGT,
            BRIEF_SEITEN,
            FK_STD_POST_DATEN_ERFASSUNG_STATUS,
            DATENERFASSUNG_FINISHED_DATE,
            FK_KON_PERSON_EMPFAENGER,
            FK_KON_PERSON_SENDER,
            FK_KON_GESCHAEFTSPARTNER_SENDER,
            FK_ORG_UNIT_SENDER,
            FK_ADR_ADRESSE_EMPFAENGER,
            FK_ADR_ADRESSE_SENDER,
            BRIEF_VOM,
            MODIFIED_BY
        } = req.body;

        const result = await pool.query(
            `UPDATE "COMPANY"."T_POST_BRIEF_EMAIL"
            SET
                "FK_MDT_MANDANT" = $1,
                "MODIFIED_AT" = NOW(),
                "HEADER" = $2,
                "EINGANGSDATUM_EMAIL" = $3,
                "EINGANGSDATUM_BRIEF" = $4,
                "ELEKTRONISCHER_INHALT" = $5,
                "INHALTSBESCHREIBUNG" = $6,
                "FK_STD_POST_TYPE" = $7,
                "FK_STD_POST_STATUS" = $8,
                "DATUM_ERLEDIGT" = $9,
                "BRIEF_SEITEN" = $10,
                "FK_STD_POST_DATEN_ERFASSUNG_STATUS" = $11,
                "DATENERFASSUNG_FINISHED_DATE" = $12,
                "FK_KON_PERSON_EMPFAENGER" = $13,
                "FK_KON_PERSON_SENDER" = $14,
                "FK_KON_GESCHAEFTSPARTNER_SENDER" = $15,
                "FK_ORG_UNIT_SENDER" = $16,
                "FK_ADR_ADRESSE_EMPFAENGER" = $17,
                "FK_ADR_ADRESSE_SENDER" = $18,
                "BRIEF_VOM" = $19,
                "MODIFIED_BY" = $20
            WHERE "PK_POST_BRIEF_EMAIL" = $21
            RETURNING "PK_POST_BRIEF_EMAIL"`,
            [
                FK_MDT_MANDANT,
                HEADER,
                EINGANGSDATUM_EMAIL,
                EINGANGSDATUM_BRIEF,
                ELEKTRONISCHER_INHALT,
                INHALTSBESCHREIBUNG,
                FK_STD_POST_TYPE,
                FK_STD_POST_STATUS,
                DATUM_ERLEDIGT,
                BRIEF_SEITEN,
                FK_STD_POST_DATEN_ERFASSUNG_STATUS,
                DATENERFASSUNG_FINISHED_DATE,
                FK_KON_PERSON_EMPFAENGER,
                FK_KON_PERSON_SENDER,
                FK_KON_GESCHAEFTSPARTNER_SENDER,
                FK_ORG_UNIT_SENDER,
                FK_ADR_ADRESSE_EMPFAENGER,
                FK_ADR_ADRESSE_SENDER,
                BRIEF_VOM,
                MODIFIED_BY,
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Record with id ${id} not found`
            });
        }

        res.json({
            success: true,
            id: result.rows[0].PK_POST_BRIEF_EMAIL
        });

    } catch (error) {
        console.error("Update error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to update post record",
            details: error.message
        });
    }
});


app.post("/kasse/insert", async (req, res) => {
    try {
        const {
            fk_std_kto_kontotyp,
            fk_ein_aus,
            datum,
            betrag,
            buchungstext,
            comm,
            jahr,
            fk_main_key,
            fk_kto_bankkonto,
            fremdwaehrungsbetrag,
            fk_bas_mon_fremdwaehrung,
            fk_bas_kal_arbeitstag,
            fk_bas_kat_kategorie,
            fk_std_verw_verwendungszweck,
            fk_inv_inventar,
            fk_loc_location,
            fk_main_key_bankkonto,
            datum_dupl_ok,
            dupl_bemerkung,
            fk_contr_dupl_status,
            fk_steu_steuer_monat,
            fk_steu_steuer_voranmeldg,
            datum_steuerb_ueberg,
            datum_finanzamt_ueberg,
            gesamt_betrag,
            gebuehren,
            datum_lex_buchung_ok,
            datum_var,
            fk_std_contr_status_kat,
            fk_std_contr_status_verw,
            datum_status_verw,
            datum_status_kat,
            kontostand_eur,
            fk_bas_steu_steuer_satz_frmdw,
            frmdw_netto_betrag,
            frmdw_mwst_betrag,
            frmdw_brutto_betrag,
            frmdw_brutto_incl_trinkg,
            fk_bas_mon_frmdw,
            fk_bas_mon_frmdw_mwst_satz,
            dummy,
            fk_kon_im_auftrag_von,
            offener_betrag_check,
            offener_betrag_datum,
            offener_betrag_bemerkung,
            sort1,
            text_buchungsdatum,
            text_buchungsdatum_date,
            text_buchungsdatum_time,
            text_buchungsdatum_char,
            created_by,
            modified_by,
            modified_at,
            fk_mdt_mandant,
            datum_all_ok,
            datum_zuord_kto_auszug_ok,
            final_cnt_zuord_belege,
            datum_load,
            fk_kto_bankkonto_ziel,
            fk_kto_bankkonto_herkunft
        } = req.body;

        // Required field validation
        if (!fk_std_kto_kontotyp || !datum || !betrag) {
            return res.status(400).json({
                error: "fk_std_kto_kontotyp, datum, and betrag are required",
                received: req.body
            });
        }

        // Build dynamic SQL query based on provided fields
        const fields = [];
        const values = [];
        const placeholders = [];
        let paramCount = 1;

        // Helper function to add field if value exists
        const addField = (fieldName, value) => {
            if (value !== undefined && value !== null && value !== '') {
                fields.push(`"${fieldName}"`);
                values.push(value);
                placeholders.push(`$${paramCount}`);
                paramCount++;
            }
        };

        // Add required fields first
        fields.push('"FK_STD_KTO_KONTOTYP"', '"DATUM"', '"BETRAG"');
        values.push(fk_std_kto_kontotyp, datum, betrag);
        placeholders.push('$1', '$2', '$3');
        paramCount = 4;

        // Add optional fields only if they have values
        addField("FK_EIN_AUS", fk_ein_aus);
        addField("BUCHUNGSTEXT", buchungstext);
        addField("COMM", comm);
        addField("JAHR", jahr);
        //addField("FK_MAIN_KEY", nextval('"COMPANY"."KTO_KONTO_SEQ"'));
        addField("FK_KTO_BANKKONTO", fk_kto_bankkonto);
        addField("FREMDWAEHRUNGSBETRAG", fremdwaehrungsbetrag);
        addField("FK_BAS_MON_FREMDWAEHRUNG", fk_bas_mon_fremdwaehrung);
        addField("FK_BAS_KAL_ARBEITSTAG", fk_bas_kal_arbeitstag);
        addField("FK_BAS_KAT_KATEGORIE", fk_bas_kat_kategorie);
        addField("FK_STD_VERW_VERWENDUNGSZWECK", fk_std_verw_verwendungszweck);
        addField("FK_INV_INVENTAR", fk_inv_inventar);
        addField("FK_LOC_LOCATION", fk_loc_location);
        addField("FK_MAIN_KEY_BANKKONTO", fk_main_key_bankkonto);
        addField("DATUM_DUPL_OK", datum_dupl_ok);
        addField("DUPL_BEMERKUNG", dupl_bemerkung);
        addField("FK_CONTR_DUPL_STATUS", fk_contr_dupl_status);
        addField("FK_STEU_STEUER_MONAT", fk_steu_steuer_monat);
        addField("FK_STEU_STEUER_VORANMELDG", fk_steu_steuer_voranmeldg);
        addField("DATUM_STEUERB_UEBERG", datum_steuerb_ueberg);
        addField("DATUM_FINANZAMT_UEBERG", datum_finanzamt_ueberg);
        addField("GESAMT_BETRAG", gesamt_betrag);
        addField("GEBUEHREN", gebuehren);
        addField("DATUM_LEX_BUCHUNG_OK", datum_lex_buchung_ok);
        addField("DATUM_VAR", datum_var);
        addField("FK_STD_CONTR_STATUS_KAT", fk_std_contr_status_kat);
        addField("FK_STD_CONTR_STATUS_VERW", fk_std_contr_status_verw);
        addField("DATUM_STATUS_VERW", datum_status_verw);
        addField("DATUM_STATUS_KAT", datum_status_kat);
        addField("KONTOSTAND_EUR", kontostand_eur);
        addField("FK_BAS_STEU_STEUER_SATZ_FRMDW", fk_bas_steu_steuer_satz_frmdw);
        addField("FRMDW_NETTO_BETRAG", frmdw_netto_betrag);
        addField("FRMDW_MWST_BETRAG", frmdw_mwst_betrag);
        addField("FRMDW_BRUTTO_BETRAG", frmdw_brutto_betrag);
        addField("FRMDW_BRUTTO_INCL_TRINKG", frmdw_brutto_incl_trinkg);
        addField("FK_BAS_MON_FRMDW", fk_bas_mon_frmdw);
        addField("FK_BAS_MON_FRMDW_MWST_SATZ", fk_bas_mon_frmdw_mwst_satz);
        addField("DUMMY", dummy);
        addField("FK_KON_IM_AUFTRAG_VON", fk_kon_im_auftrag_von);
        addField("OFFENER_BETRAG_CHECK", offener_betrag_check);
        addField("OFFENER_BETRAG_DATUM", offener_betrag_datum);
        addField("OFFENER_BETRAG_BEMERKUNG", offener_betrag_bemerkung);
        addField("SORT1", sort1);
        addField("TEXT_BUCHUNGSDATUM", text_buchungsdatum);
        addField("TEXT_BUCHUNGSDATUM_DATE", text_buchungsdatum_date);
        addField("TEXT_BUCHUNGSDATUM_TIME", text_buchungsdatum_time);
        addField("TEXT_BUCHUNGSDATUM_CHAR", text_buchungsdatum_char);
        addField("CREATED_BY", created_by);
        addField("MODIFIED_BY", modified_by);
        addField("MODIFIED_AT", modified_at);
        addField("FK_MDT_MANDANT", fk_mdt_mandant);
        addField("DATUM_ALL_OK", datum_all_ok);
        addField("DATUM_ZUORD_KTO_AUSZUG_OK", datum_zuord_kto_auszug_ok);
        addField("FINAL_CNT_ZUORD_BELEGE", final_cnt_zuord_belege);
        addField("DATUM_LOAD", datum_load);
        addField("FK_KTO_BANKKONTO_ZIEL", fk_kto_bankkonto_ziel);
        addField("FK_KTO_BANKKONTO_HERKUNFT", fk_kto_bankkonto_herkunft);

        const sql = `INSERT INTO "COMPANY"."T_KTO_KAS_KASSE" (${fields.join(', ')}, "FK_MAIN_KEY") VALUES (${placeholders.join(', ')}, nextval('"COMPANY"."KTO_KONTO_SEQ"')) RETURNING "PK_KTO_KAS_KASSE"`;

        const result = await pool.query(sql, values);

        if (result.rows.length === 0) {
            return res.status(500).json({
                error: "Failed to create kasse record",
                details: "No ID returned after insertion"
            });
        }

        res.status(201).json({
            success: true,
            kasseRecordId: result.rows[0].PK_KTO_KAS_KASSE,
            message: "Kasse record created successfully",
            insertedFields: fields.length
        });

    } catch (error) {
        console.error("Database error:", error.message);
        console.log("Values length:", Object.keys(req.body).length);
        res.status(500).json({
            success: false,
            error: "Failed to insert kasse record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack,
                sqlState: error.code
            } : undefined
        });
    }
});
// Insert an image into T_BILD_BILDER table
app.post("/person_rel_group/insert", async (req, res) => {
    try {
        const { fkkonperson, fkkonpersongroup } = req.body;

      

        const result = await pool.query(
            `insert into "COMPANY"."T_REL_KON_PERSON_PERSON_GROUP" ("FK_KON_PERSON","FK_KON_PERSON_GROUP")
select $1, $2 `,
            [fkkonperson, fkkonpersongroup ]
        );

       

        res.status(201).json({
            success: true,
            imageRecordId: result.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert image record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});


app.post("/wahl_kandidat_person_beruf/insert", async (req, res) => {
  const { fkKonPerson, pkWahlKandidat } = req.body;

  if (!fkKonPerson || !pkWahlKandidat || !fkKonPersonAlt) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Select PK_WORK_BERUF values
    const selectResult = await client.query(
      `
      SELECT DISTINCT "PK_WORK_BERUF"
      FROM "COMPANY"."V_WAHL_KANDIDATEN_BERUF"
      WHERE "PK_WAHL_KANDIDATEN" = $1
         OR "FK_KON_PERSON" = $2
      `,
      [pkWahlKandidat, fkKonPerson]
    );

    const berufIds = selectResult.rows.map(r => r.PK_WORK_BERUF);

    if (berufIds.length === 0) {
      await client.query("ROLLBACK");
      return res.json({ inserted: 0, message: "No BERUFE found" });
    }

    // 2. Insert into relation table (duplicate-safe)
    const insertValues = berufIds
      .map((_, idx) => `($1, $${idx + 2})`)
      .join(", ");

    const insertQuery = `
      INSERT INTO "COMPANY"."T_REL_KON_PERSON_BERUF"
      ("FK_KON_PERSON", "FK_WORK_BERUF")
      VALUES ${insertValues}
      ON CONFLICT DO NOTHING
      RETURNING *;
    `;

    const insertParams = [fkKonPerson, ...berufIds];

    const insertResult = await client.query(insertQuery, insertParams);

    await client.query("COMMIT");

    res.json({
      inserted: insertResult.rowCount,
      rows: insertResult.rows
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

app.post("/rel_person_beruf/insert", async (req, res) => {
  const { FK_KON_PERSON, FK_WORK_BERUF } = req.body;

  if (!FK_KON_PERSON || !FK_WORK_BERUF) {
    return res.status(400).json({
      error: "Missing parameters: FK_KON_PERSON and FK_WORK_BERUF are required"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO "COMPANY"."T_REL_KON_PERSON_BERUF"
      ("FK_KON_PERSON", "FK_WORK_BERUF")
      VALUES ($1, $2)
      RETURNING *;
      `,
      [FK_KON_PERSON, FK_WORK_BERUF]
    );

    await client.query("COMMIT");

    res.json({
      inserted: result.rowCount,
      row: result.rows[0]
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Database error" });
  } finally {
    client.release();
  }
});

app.post("/kontakt/insert", async (req, res) => {
    try {
        const { 
            EMAIL,
            FESTNETZNUMMER,
            MOBILNUMMER,
            WEBSEITE,
            FAX,
            BESCHREIBUNG, 
            TELEX 
        } = req.body;

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_KON_KONTAKT" (
                "EMAIL",
                "FESTNETZNUMMER",
                "MOBILNUMMER",
                "WEBSEITE",
                "FAX",
                "BESCHREIBUNG", 
                "TELEX"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING "PK_KON_KONTAKT"`,
            [
                EMAIL,
                FESTNETZNUMMER,
                MOBILNUMMER,
                WEBSEITE,
                FAX,
                BESCHREIBUNG, 
                TELEX
            ]
        );

        res.status(201).json({
            success: true,
            kontaktId: result.rows[0].PK_KON_KONTAKT,
            message: "Kontakt erfolgreich erstellt"
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert contact",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});


app.post("/person_beruf_rel/insert", async (req, res) => {
    try {
        const { fkkonperson, fkworkberuf } = req.body;

      

        const result = await pool.query(
            `insert into "COMPANY"."T_REL_KON_PERSON_BERUF" ("FK_KON_PERSON","FK_WORK_BERUF")
select $1, $2 `,
            [fkkonperson, fkworkberuf]
        );

       

        res.status(201).json({
            success: true,
            imageRecordId: result.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert image record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});


app.post("/person_beruf_rel/delete", async (req, res) => {
    try {
        const { id, fkkonperson, fkworkberuf } = req.body;

        // Validate required parameters
        if (!id && !fkkonperson && !fkworkberuf) {
            return res.status(400).json({
                success: false,
                error: "Either ID (primary key) or at least one foreign key (fkkonperson or fkworkberuf) is required"
            });
        }

        let result;
        let query;
        let params = [];

        if (id) {
            // Delete by primary key
            query = `DELETE FROM "COMPANY"."T_REL_KON_PERSON_BERUF" WHERE "PK_REL_KON_PERSON_BERUF" = $1`;
            params = [id];
        } else if (fkkonperson && fkworkberuf) {
            // Delete by both foreign keys
            query = `DELETE FROM "COMPANY"."T_REL_KON_PERSON_BERUF" WHERE "FK_KON_PERSON" = $1 AND "FK_WORK_BERUF" = $2`;
            params = [fkkonperson, fkworkberuf];
        } else if (fkkonperson) {
            // Delete by fkkonperson only
            query = `DELETE FROM "COMPANY"."T_REL_KON_PERSON_BERUF" WHERE "FK_KON_PERSON" = $1`;
            params = [fkkonperson];
        } else if (fkworkberuf) {
            // Delete by fkworkberuf only
            query = `DELETE FROM "COMPANY"."T_REL_KON_PERSON_BERUF" WHERE "FK_WORK_BERUF" = $1`;
            params = [fkworkberuf];
        }

        result = await pool.query(query, params);

        // Check if any record was deleted
        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                error: "No matching record found to delete"
            });
        }

        res.status(200).json({
            success: true,
            message: "Record deleted successfully",
            deletedCount: result.rowCount
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to delete record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.post("/branches/insert", async (req, res) => {
    try {
        const { 
            BRANCH_NAME,
            FK_MDT_MANDANT,
            BRANCH_NAME_ENG,
            BRANCH_NAME_DEU,
            DIENSTLEISTUNG 
        } = req.body;

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_BAS_ORG_BRANCHES" (
                "BRANCH_NAME",
                "FK_MDT_MANDANT",
                "BRANCH_NAME_ENG",
                "BRANCH_NAME_DEU",
                "DIENSTLEISTUNG"
            ) VALUES ($1, $2, $3, $4, $5) 
            RETURNING "PK_BAS_ORG_BRANCHES"`,
            [ 
                BRANCH_NAME,
                FK_MDT_MANDANT || 1,
                BRANCH_NAME_ENG,
                BRANCH_NAME_DEU,
                DIENSTLEISTUNG 
            ]
        );

        res.status(201).json({
            success: true,
            branchId: result.rows[0].PK_BAS_ORG_BRANCHES,
            message: "Branch successfully created"
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert branch",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.post("/marken/insert", async (req, res) => {
    try {
        const { 
            MARKEN_NAME,
            FK_MDT_MANDANT,
            MARKEN_NAME_ENG,
            MARKEN_NAME_DEU 
        } = req.body;

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_BAS_ORG_MARKEN" (
                "MARKEN_NAME",
                "FK_MDT_MANDANT",
                "MARKEN_NAME_ENG",
                "MARKEN_NAME_DEU"
            ) VALUES ($1, $2, $3, $4) 
            RETURNING "PK_BAS_ORG_MARKEN"`,
            [ 
                MARKEN_NAME,
                FK_MDT_MANDANT || 1,
                MARKEN_NAME_ENG,
                MARKEN_NAME_DEU 
            ]
        );

        res.status(201).json({
            success: true,
            markenId: result.rows[0].PK_BAS_ORG_MARKEN,
            message: "Marke successfully created"
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert marke",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});




app.post("/org_unit/insert", async (req, res) => {
    try {
        const { org_unit_name, comm } = req.body;

      

        const result = await pool.query(
            `insert into "COMPANY"."T_ORG_UNIT" ("ORG_UNIT_NAME","COMM","FK_MDT_MANDANT")
select $1,$2,1 returning "PK_ORG_UNIT"`,
            [org_unit_name, comm ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "No matching image found",
                details: `No image with id = ${imageId}`
            });
        }

        res.status(201).json({
            success: true,
            imageRecordId: result.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert image record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});




// Insert an image into T_BILD_BILDER table
app.post("/org_unit_rel_main/insert", async (req, res) => {
    try {
        const { fkkonorgunit, fkkonorgunitmain } = req.body;



        const result = await pool.query(
            `insert into "COMPANY"."T_REL_ORG_ORG_UNIT_ORG_UNIT" ("FK_ORG_ORG_UNIT","FK_ORG_ORG_UNIT_MAIN","FK_MDT_MANDANT")
select $1, $2,1 `,
            [fkkonorgunit, fkkonorgunitmain ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "No matching image found",
               
            });
        }

        res.status(201).json({
            success: true,
            imageRecordId: result.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert image record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

// Insert an image into T_BILD_BILDER table
app.post("/org_unit_branches_rel/insert", async (req, res) => {
    try {
        const { fkkonorgunit, fkbasorgbranches } = req.body;



        const result = await pool.query(
            `insert into "COMPANY"."T_REL_ORG_ORG_UNIT_BRANCHES" ("FK_ORG_ORG_UNIT","FK_BAS_ORG_BRANCHES","FK_MDT_MANDANT")
select $1::integer, $2::integer,1 `,
            [fkkonorgunit, fkbasorgbranches ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "No matching image found",
               
            });
        }

        res.status(201).json({
            success: true,
            imageRecordId: result.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert image record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

// Insert an image into T_BILD_BILDER table
app.post("/org_unit_marken_rel/insert", async (req, res) => {
    try {
        const { fkkonorgunit, fkbasorgmarken } = req.body;



        const result = await pool.query(
            `insert into "COMPANY"."T_REL_ORG_ORG_UNIT_MARKEN" ("FK_ORG_ORG_UNIT","FK_BAS_ORG_MARKEN","FK_MDT_MANDANT")
select $1::integer, $2::integer,1 `,
            [fkkonorgunit, fkbasorgmarken ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "No matching image found",
               
            });
        }

        res.status(201).json({
            success: true,
            imageRecordId: result.rows[0]
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert image record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});


// Insert an image into T_BILD_BILDER table
app.post("/person/insert", async (req, res) => {
    try {
        const { titel, vorname, nachname, fkkonpersongeschlecht,geburtsjahr, rufname, kuenstlername, geburtsort, sterbeort} = req.body;

   
// Then insert the person record
        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_KON_PERSON" ("TITEL", "VORNAME", "NACHNAME","FK_STD_KON_PERSON_GESCHLECHT", "FK_MDT_MANDANT","GEBURTSJAHR","KUENSTLERNAME","RUFNAME","GEBURTSORT","STERBEORT")
             VALUES ($1, $2, $3,$4,1,$5,$6,$7,$8,$9) RETURNING "PK_KON_PERSON"`,
            [titel, vorname, nachname, fkkonpersongeschlecht, geburtsjahr,kuenstlername,rufname,geburtsort, sterbeort]
        );

        res.status(201).json({
            success: true,
            personRecordId: result.rows[0].PK_KON_PERSON
        });
        console.log(result.rows[0].PK_KON_PERSON);

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert person record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});



// Insert an image into T_BILD_BILDER table
app.post("/geschaeftspartner_rel/insert", async (req, res) => {
    try {
        const { 
            FK_KON_GESCHAEFTSPARTNER,
            FK_KON_KONTAKT,
            FK_ADR_ADRESSE,
            FK_ORG_UNIT,
            FK_KON_PERSON,
            FK_LOC_LOCATION,
            FK_ADR_ADRESSE_SCHNELL,
            FK_INP_BELEGE_ALL,
            FK_FIRM_MITARBEITER
        } = req.body;

 

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_REL_KON_GESCHAEFTSPARTNER_KONTAKT" (
                "FK_KON_GESCHAEFTSPARTNER",
                "FK_KON_KONTAKT",
                "FK_ADR_ADRESSE",
                "CREATED_AT",
                "FK_ORG_UNIT",
                "FK_KON_PERSON",
                "FK_LOC_LOCATION",
                "FK_ADR_ADRESSE_SCHNELL",
                "FK_INP_BELEGE_ALL",
                "VALID",
                "VALID_FROM",
                "VALID_TO",
                "FK_FIRM_MITARBEITER",
                "FK_MDT_MANDANT"
            ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, 1, NOW(),now(), $9, 1)`,
            [
                FK_KON_GESCHAEFTSPARTNER,
                FK_KON_KONTAKT || null,
                FK_ADR_ADRESSE || null,
                FK_ORG_UNIT || null,
                FK_KON_PERSON || null,
                FK_LOC_LOCATION || null,
                FK_ADR_ADRESSE_SCHNELL || null,
                FK_INP_BELEGE_ALL || null,
                FK_FIRM_MITARBEITER || null
            ]
        );

        res.status(201).json({
            success: true,
            message: "Business partner relationship created successfully",
            insertedId: result.rows[0] ? result.rows[0].id : null
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert business partner relationship",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});




app.post("/buchungen/insert", async (req, res) => {
    try {
        const {
            Nr,
            Datum,
            Belegnr,
            Buchungsdatum,
            Leistungsdatum,
            Beschreibung,
            Betrag,
            Steuersatz,
            Steuerbetrag,
            Soll,
            Haben,
            Steuerkonto,
            Benutzer,
            Page,
            CreateDate
        } = req.body;

        // Optional: validate required fields
        if (!Nr || !Buchungsdatum || !Betrag) {
            return res.status(400).json({
                error: "Missing required fields",
                received: req.body
            });
        }

        const result = await pool.query(`
            INSERT INTO "COMPANY"."T_IMP_LEX_OFFICE_BUCHUNGEN" (
                "Nr.",
                "Datum",
                "Belegnr.",
                "Buchungsdatum",
                "Leistungsdatum",
                "Beschreibung",
                "Betrag",
                "Steuersatz",
                "Steuerbetrag",
                "Soll",
                "Haben",
                "Steuerkonto",
                "Benutzer",
                "Page",
                "CreateDate"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
            )
            RETURNING "ID"
        `, [ 
            Nr,
            Datum,
            Belegnr,
            Buchungsdatum,
            Leistungsdatum,
            Beschreibung,
            Betrag,
            Steuersatz,
            Steuerbetrag,
            Soll,
            Haben,
            Steuerkonto,
            Benutzer,
            Page,
            CreateDate
        ]);

        res.status(201).json({
            success: true,
            insertedId: result.rows[0].id
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert Buchung record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

// DELETE endpoint
app.delete('/api/images/delete/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const result = await pool.query('DELETE FROM "COMPANY"."IMP_IMAGES" WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Image not found' });
        }
        
        res.json({ message: 'Image deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// DELETE endpoint
app.delete('/kasse/delete/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const result = await pool.query('DELETE FROM "COMPANY"."T_KTO_KAS_KASSE" WHERE "PK_KTO_KAS_KASSE"= $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Image not found' });
        }
        
        res.json({ message: 'Image deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Insert a new cash register entry based on document ID
app.post("/cash-register/insert", async (req, res) => {
    try {
        const { documentId } = req.body;

        // Validate required field
        if (!documentId) {
            return res.status(400).json({
                error: "documentId is required",
                received: req.body
            });
        }

        // Database operation to insert cash register entry
        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_KTO_KAS_KASSE" (
                "DATUM", 
                "BUCHUNGSTEXT", 
                "BETRAG", 
                "GESAMT_BETRAG",
                "JAHR", 
                "COMM", 
                "FK_BAS_STEU_STEUER_SATZ_FRMDW",
                "FRMDW_NETTO_BETRAG",
                "FRMDW_MWST_BETRAG",
                "FRMDW_BRUTTO_BETRAG",
                "FRMDW_BRUTTO_INCL_TRINKG",
                "FK_BAS_MON_FRMDW",
                "FK_BAS_MON_FRMDW_MWST_SATZ",
                "CREATED_AT",
                "FK_KTO_BANKKONTO",
                "FK_STD_KTO_KONTOTYP",
                "FK_MAIN_KEY"
            )
            SELECT 
                "BELEGDATUM",
                "PK_INP_BELEGE_ALL" || ' - ' || SUBSTR("BEZEICHNUNG", 1, 200),
                -1 * "BRUTTO_BETRAG",
                -1 * "BRUTTO_BETRAG",
                SUBSTR("BELEGDATUM"::text, 1, 4)::double precision,
                null,
                "FK_FRMDW_BAS_STEU_STEUER_SATZ",
                "FRMDW_NETTO_BETRAG",
                "FRMDW_MWST_BETRAG",
                "FRMDW_BRUTTO_BETRAG",
                "FRMDW_BRUTTO_INCL_TRINKG",
                "FK_FRMDW_BAS_MON_WAEHRUNG",
                "FK_FRMDW_BAS_MON_MWST_SATZ",
                now(),
                61,
                6,
                nextval('"COMPANY"."KTO_KONTO_SEQ"')
            FROM "COMPANY"."T_INP_BELEGE_ALL" 
            WHERE "PK_INP_BELEGE_ALL" = $1
            RETURNING "FK_MAIN_KEY"`,
            [documentId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "No matching document found",
                details: `No document with PK_INP_BELEGE_ALL = ${documentId}`
            });
        }

        // Return just the primary key
        res.status(201).json({
            success: true,
            cashRegisterEntryId: result.rows[0].FK_MAIN_KEY
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert cash register entry",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

// Get all stimmzettel with pagination
app.get("/stimmzettel", async (req, res) => {
    try {
        // Parse pagination parameters from query string
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 1200;
        const offset = (page - 1) * limit;
        
        // Get total count of records
        const countResult = await pool.query(
            `SELECT COUNT(*) as total FROM "COMPANY"."T_WAHL_STIMM_ZETTEL"`
        );
        const total = parseInt(countResult.rows[0].total);
        
        // Get paginated data
        const result = await pool.query(
            `SELECT "PK_WAHL_STIMM_ZETTEL",
 "FK_WAHL_WAHL",
 "CREATED_BY",
 "CREATED_AT",
 "MODIFIED_BY",
 "MODIFIED_AT",
 "FK_ADR_ORT",
 "FK_WAHL_STIMM_KREIS",
 "ANZAHL_STIMMEN",
 "STIMME",
 "BESCHREIBUNG",
 "FARBE",
 "GROESSE",
 "ERHALT",
 "VERSAND",
 "COMM",
 "WEN",
 "TEIL",
 "FK_MDT_MANDANT",
 "FK_KON_PERSON_OWNER",
 "BEZEICHNUNG",
 "LINK_ZETTEL",
 "ANZ_SCHNELLMELDUNG_MAX",
 "ANZ_SCHNELLMELDUNGEN",
 "WAHLBERECHTIGTE",
 "ANZAHL_STIMMEN",
 "PROZ",
 "ANZ_SCHNELLMELD_MAX_BRIEF",
 "ANZ_SCHNELLMELD_BRIEF",
 "ANZ_WAEHLER_BRIEF",
 "ANZ_SCHNELLMELD_MAX_URNE",
 "ANZ_SCHNELLMELD_URNE",
 "ANZ_WAHLBERECHTIGTE_URNE",
 "ANZ_WAEHLER_URNE",
 "PROZ_WAEHLER_URNE",
 "DUMMY",
 "FLG_URNE",
 "FLG_BRIEF",
 "FK_WAHL_WAHLRAUM",
 "FK_WAHL_STIMM_BEZIRK",
 "FK_STD_WAHL_STATUS",
 "FLG_ERSTSTIMME",
 "FLG_ZWEITSTIMME",
 "FLG_BRIEFWAHLVORSCHLAEGE",
"FK_ADR_REGION",
 "COMM_1",
 "FINAL_CNT_LISTENPLAETZE",
 "FINAL_CNT_DIREKTKANDIDATEN"

             FROM "COMPANY"."T_WAHL_STIMM_ZETTEL"
             ORDER BY "PK_WAHL_STIMM_ZETTEL"
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        
        // Calculate pagination metadata
        const totalPages = Math.ceil(total / limit);
        
        res.json({
            data: result.rows,
            pagination: {
                total,
                totalPages,
                currentPage: page,
                limit,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch stimmzettel",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Get single account by ID with proper field mapping
app.get("/stimmzettel/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
               *
             FROM "COMPANY"."T_WAHL_STIMM_ZETTEL"
             WHERE "PK_WAHL_STIMM_ZETTEL" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/stimmzettel/wahl/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
               "PK_WAHL_STIMM_ZETTEL",
 "FK_WAHL_WAHL",
 "CREATED_BY",
 "CREATED_AT",
 "MODIFIED_BY",
 "MODIFIED_AT",
 "FK_ADR_ORT",
 "FK_WAHL_STIMM_KREIS",
 "ANZAHL_STIMMEN",
 "STIMME",
 "BESCHREIBUNG",
 "FARBE",
 "GROESSE",
 "ERHALT",
 "VERSAND",
 "COMM",
 "WEN",
 "TEIL",
 "FK_MDT_MANDANT",
 "FK_KON_PERSON_OWNER",
 "BEZEICHNUNG",
 "LINK_ZETTEL",
 "ANZ_SCHNELLMELDUNG_MAX",
 "ANZ_SCHNELLMELDUNGEN",
 "WAHLBERECHTIGTE",
 "ANZAHL_STIMMEN",
 "PROZ",
 "ANZ_SCHNELLMELD_MAX_BRIEF",
 "ANZ_SCHNELLMELD_BRIEF",
 "ANZ_WAEHLER_BRIEF",
 "ANZ_SCHNELLMELD_MAX_URNE",
 "ANZ_SCHNELLMELD_URNE",
 "ANZ_WAHLBERECHTIGTE_URNE",
 "ANZ_WAEHLER_URNE",
 "PROZ_WAEHLER_URNE",
 "DUMMY",
 "FLG_URNE",
 "FLG_BRIEF",
 "FK_WAHL_WAHLRAUM",
 "FK_WAHL_STIMM_BEZIRK",
 "FK_STD_WAHL_STATUS",
 "FLG_ERSTSTIMME",
 "FLG_ZWEITSTIMME",
 "FLG_BRIEFWAHLVORSCHLAEGE",
"FK_ADR_REGION",
 "COMM_1",
 "FINAL_CNT_LISTENPLAETZE",
 "FINAL_CNT_DIREKTKANDIDATEN",
"BILD",
"BILD_BILD"
             FROM "COMPANY"."T_WAHL_STIMM_ZETTEL"
             WHERE "FK_WAHL_WAHL" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Get single account by ID with proper field mapping
app.get("/person/bild/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
               *
             FROM "COMPANY"."V_KON_PERSON_BILD" 
             WHERE "FK_KON_PERSON" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/wahl_stimmzettel_contr/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
               *
             FROM "COMPANY"."V_WAHL_STIMMZETTEL_CONTR" 
             WHERE "PK_WAHL_STIMM_ZETTEL" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});



// Get single account by ID with proper field mapping
app.get("/accounts/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
               *
             FROM "COMPANY"."V_KTO_KONTEN_ZUS" 
             WHERE "FK_MAIN_KEY" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


//app.use(cors());

// Increase payload size limit for base64 encoded images
/*app.use(bodyParser.json({ limit: '2000mb' }));
app.use(bodyParser.urlencoded({ limit: '2000mb', extended: true }));
app.use(bodyParser.raw({ limit: '2000mb' }));

app.use(express.json({ limit: '2000mb' }));
app.use(express.urlencoded({ limit: '2000mb', extended: true }));
*/
// Handle file upload with binary storage
app.post("/person/bild/ins_old", async (req, res) => {
    try {
        const { description, filename, image } = req.body;

        // Validate input fields
        if (!image || !filename) {
            return res.status(400).json({ 
                error: "Image data and filename are required",
                received: { 
                    hasImage: !!image, 
                    hasFilename: !!filename 
                }
            });
        }

        // Validate base64 data format
        const base64Regex = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/;
        if (!base64Regex.test(image)) {
            return res.status(400).json({ 
                error: "Invalid image format. Supported formats: PNG, JPEG, JPG, GIF, WEBP" 
            });
        }

        // Extract metadata and pure base64 data
        const matches = image.match(base64Regex);
        const imageType = matches[1];
        const base64Data = image.replace(base64Regex, '');

        // Verify base64 data is valid
        try {
            Buffer.from(base64Data, 'base64');
        } catch (error) {
            return res.status(400).json({ error: "Invalid base64 data" });
        }

        // Optional: Implement image compression
        let processedImage;
        try {
            const imageBuffer = Buffer.from(base64Data, 'base64');
            processedImage = await sharp(imageBuffer)
                .resize(1024, 1024, { 
                    fit: 'inside',
                    withoutEnlargement: true 
                })
                .jpeg({ quality: 80, progressive: true })
                .toBuffer();
        } catch (error) {
            console.error("Image processing error:", error);
            processedImage = Buffer.from(base64Data, 'base64');
        }

        // Database operation
        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_BILD_BILDER" 
             ("KLASSIFIKATION_1", "FILENAME") 
             VALUES ($1, $2) 
             RETURNING *`,
            [description || '', filename]
        );

        res.status(201).json({ 
            success: true,
            message: "Image added successfully", 
            data: {
                id: result.rows[0].PK_BILD_BILDER,
                filename: result.rows[0].FILENAME,
                size: processedImage.length,
                type: imageType
            }
        });
    } catch (error) {
        console.error("Database error:", error.message);
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

app.post("/person/bild/ins", async (req, res) => {
    try {
        const { description, title, category } = req.body;
        const filename = req.body.files[0]["name"];
        const image = req.body.files[0]["data"];

        // Validate input fields
        if (!image || !filename) {
            return res.status(400).json({ 
                error: "Image data and filename are required",
                received: { 
                    hasImage: !!image, 
                    hasFilename: !!filename 
                }
            });
        }

        // Validate base64 data
        if (!/^data:image\/(png|jpeg|jpg|gif);base64,/.test(image)) {
            return res.status(400).json({ 
                error: "Invalid image format. Must be base64 encoded image" 
            });
        }

        // Extract pure base64 data
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        
        // Verify base64 data
        if (Buffer.from(base64Data, 'base64').toString('base64') !== base64Data) {
            return res.status(400).json({ error: "Invalid base64 data" });
        }

        // Check file size (5MB limit)
        const fileSize = Math.ceil((base64Data.length * 3) / 4);
        if (fileSize > 5 * 1024 * 1024) {
            return res.status(400).json({ 
                error: "File size too large. Maximum size is 5MB" 
            });
        }

        // Database operation
        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_BILD_BILDER" 
             ("FILECONTENT", "FILENAME", "KLASSIFIKATION_1") 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [base64Data, filename, description || '']
        );

        res.status(201).json({ 
            success: true,
            message: "Image added successfully", 
            data: {
                id: result.rows[0].id,
                filename: result.rows[0].filename,
                size: fileSize
            }
        });
    } catch (error) {
        console.error("Database error:", error.message);
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

app.post("/document/insert", async (req, res) => {
    try {
        const { fk_main_key, fk_abl_ordner_page } = req.body;

        // Validate required field
        if (!fk_main_key) {
            return res.status(400).json({
                error: "FK_MAIN_KEY is required",
                received: req.body
            });
        }

        // Set default value if fk_abl_ordner_page is not provided
        const folderPage = fk_abl_ordner_page || 3071;

        // Database operation to insert document
        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_INP_BELEGE_ALL" 
             ("BELEGDATUM", "BEZEICHNUNG", "BRUTTO_BETRAG", "FK_ABL_ORDNER_PAGE")
             SELECT "BUCHUNGSTAG", "BUCHUNGSTEXT", "BETRAG", $2
             FROM "COMPANY"."V_KTO_KONTEN_ZUS"
             WHERE "FK_MAIN_KEY" = $1
             RETURNING "PK_INP_BELEGE_ALL"`,
            [fk_main_key, folderPage]  // Now using both parameters
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "No matching record found in T_KTO_GIROKONTO",
                details: `No record with FK_MAIN_KEY = ${fk_main_key}`
            });
        }

        // Return just the primary key
        res.status(201).json({
            success: true,
            documentId: result.rows[0].PK_INP_BELEGE_ALL
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

app.post("/work/insert", async (req, res) => {
    try {
        const { fk_inp_belege_all, fk_bild_bilder , comm} = req.body;

        // Database operation to insert document
        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_WORK_IN_BEARBEITUNG" 
             ("FK_INP_BELEGE_ALL", "FK_BILD_BILDER", "STATUS", "DATUM", "COMM")
             VALUES ($1, $2, 'NEW', now(), $3)
            
             RETURNING "PK_WORK_IN_BEARBEITUNG"`,
            [fk_inp_belege_all, fk_bild_bilder, comm]  // Now using both parameters
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "No matching record found in T_KTO_GIROKONTO",
                details: `No record with FK_MAIN_KEY = ${fk_main_key}`
            });
        }

        // Return just the primary key
        res.status(201).json({
            success: true,
            documentId: result.rows[0].PK_INP_BELEGE_ALL
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

app.post('/insert-lex-relation', async (req, res) => {
  let client;
  try {
    const { 
      fk_main_key, 
      fk_inp_belege_all = null, 
      fk_inp_belege_pos_all,
      ok_datum,
      flg_lexoffice_buchung,
      flg_lexoffice_mit_bild,
      link_lexoffice_buchung,
      lexoffice_buchung_nr,
      datum_lexoffice_buch 
    } = req.body;

    // Validate required field
    if (!fk_main_key) {
      return res.status(400).json({
        status: 'error',
        message: 'fk_main_key is required'
      });
    }

    client = await pool.connect();
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Insert record with parameterized values
    const insertResult = await client.query(`
      INSERT INTO "COMPANY"."T_REL_LEX_KTO_BEL" (
        "FK_MAIN_KEY",
        "FK_INP_BELEGE_ALL",
        "FK_INP_BELEGE_POS_ALL",
        "OK_DATUM",
        "FLG_LEXOFFICE_BUCHUNG",
        "FLG_LEXOFFICE_MIT_BILD",
        "LINK_LEXOFFICE_BUCHUNG",
        "LEXOFFICE_REFERENZ_NR",
        "DATUM_LEXOFFICE_BUCH",
        "CREATED_AT",
        "MODIFIED_AT"
      ) 
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING "PK_REL_LEX_KTO_BEL", "FK_MAIN_KEY", "FK_INP_BELEGE_ALL"
    `, [
      fk_main_key, 
      fk_inp_belege_all,
      fk_inp_belege_pos_all,
      ok_datum,
      flg_lexoffice_buchung,
      flg_lexoffice_mit_bild,
      link_lexoffice_buchung,
      lexoffice_buchung_nr,      // $8 - for LEXOFFICE_REFERENZ_NR
      datum_lexoffice_buch       // $9 - for DATUM_LEXOFFICE_BUCH
    ]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: `Successfully inserted new relation`,
      insertedRecord: insertResult.rows[0]
    });
    
  } catch (err) {
    // Rollback on error
    if (client) await client.query('ROLLBACK');
    console.error('Database error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to insert record',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

app.post("/document/insert1", async (req, res) => {
    try {
        const { belegdatum, bezeichnung,  fk_abl_ordner_page, brutto_betrag, belegnummer,titel } = req.body;


        // Set default value if fk_abl_ordner_page is not provided
        const folderPage = fk_abl_ordner_page || 3071;

        // Database operation to insert document
        const result = await pool.query(
            ` 	
 	INSERT INTO "COMPANY"."T_INP_BELEGE_ALL" (
    "BELEGDATUM", 
    "BEZEICHNUNG", 
    "FK_ABL_ORDNER_PAGE",
    "BRUTTO_BETRAG",
    "BELEGNUMMER",
 "TITEL",
    "JAHR"
  
) 
VALUES (
    TO_DATE($1, 'DD.MM.YYYY'),
    $2,
$3,
   $4,
    $5,
$6,
    substr(TO_DATE($1, 'DD.MM.YYYY')::text,1,4)::double precision
)
RETURNING "PK_INP_BELEGE_ALL"`,
            [belegdatum, bezeichnung,  folderPage, brutto_betrag, belegnummer, titel]  // Now using both parameters
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "No matching record found in T_KTO_GIROKONTO",
                details: `No record with FK_MAIN_KEY = ${fk_main_key}`
            });
        }

        // Return just the primary key
        res.status(201).json({
            success: true,
            documentId: result.rows[0].PK_INP_BELEGE_ALL
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



// Insert records endpoint
app.post('/insert-girokonto-records', async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Insert records with transformation
    const insertResult = await client.query(`
      INSERT INTO "COMPANY"."T_KTO_GIROKONTO" (
        "BUCHUNGSTAG",
        "BUCHUNGSTEXT",
        "BUCHUNGSTEXT1",
        "BETRAG",
        "WAEHRUNG",
        "FK_MAIN_KEY"
      ) 
      SELECT 
        TO_DATE(buchungsdatum, 'DD.MM.YYYY'),
        description,
        details,
        CAST(REPLACE(REPLACE(amount, '.', ''), ',', '.') AS DOUBLE PRECISION),
        'EUR',
        nextval('"COMPANY"."KTO_KONTO_SEQ"') 
      FROM "COMPANY".T_IMP_KTO_GIROKONTO1
      RETURNING "FK_MAIN_KEY"
    `);
    

    
    // Commit transaction
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: `Inserted ${insertResult.rowCount} records`,
      insertedRecords: insertResult.rows
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to insert records',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});


/**
 * Update FK_MAIN_KEY for records where it's null
 */
app.post('/update-main-keys', async (req, res) => {
  let client;
  try {
    client = await pool.connect();
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Execute the update and return the assigned keys
    const result = await client.query(`
      UPDATE "COMPANY"."T_KTO_GIROKONTO" 
      SET "FK_MAIN_KEY" = nextval('"COMPANY"."KTO_KONTO_SEQ"') 
      WHERE "FK_MAIN_KEY" IS NULL 
      RETURNING "FK_MAIN_KEY"
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: `Updated ${result.rowCount} records`,
      assignedKeys: result.rows.map(row => row.FK_MAIN_KEY)
    });
    
  } catch (err) {
    // Rollback on error
    if (client) await client.query('ROLLBACK');
    console.error('Database error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update records',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (client) client.release();
  }T
});

app.put("/kasse/update/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            fk_std_kto_kontotyp,
            fk_ein_aus,
            datum,
            betrag,
            buchungstext,
            comm,
            jahr,
            fk_main_key,
            fk_kto_bankkonto,
            fremdwaehrungsbetrag,
            fk_bas_mon_fremdwaehrung,
            fk_bas_kal_arbeitstag,
            fk_bas_kat_kategorie,
            fk_std_verw_verwendungszweck,
            fk_inv_inventar,
            fk_loc_location,
            fk_main_key_bankkonto,
            datum_dupl_ok,
            dupl_bemerkung,
            fk_contr_dupl_status,
            fk_steu_steuer_monat,
            fk_steu_steuer_voranmeldg,
            datum_steuerb_ueberg,
            datum_finanzamt_ueberg,
            gesamt_betrag,
            gebuehren,
            datum_lex_buchung_ok,
            datum_var,
            fk_std_contr_status_kat,
            fk_std_contr_status_verw,
            datum_status_verw,
            datum_status_kat,
            kontostand_eur,
            fk_bas_steu_steuer_satz_frmdw,
            frmdw_netto_betrag,
            frmdw_mwst_betrag,
            frmdw_brutto_betrag,
            frmdw_brutto_incl_trinkg,
            fk_bas_mon_frmdw,
            fk_bas_mon_frmdw_mwst_satz,
            dummy,
            fk_kon_im_auftrag_von,
            offener_betrag_check,
            offener_betrag_datum,
            offener_betrag_bemerkung,
            sort1,
            text_buchungsdatum,
            text_buchungsdatum_date,
            text_buchungsdatum_time,
            text_buchungsdatum_char,
            modified_by,
            fk_mdt_mandant,
            datum_all_ok,
            datum_zuord_kto_auszug_ok,
            final_cnt_zuord_belege,
            datum_load,
            fk_kto_bankkonto_ziel,
            fk_kto_bankkonto_herkunft
        } = req.body;

        // Validate ID
        if (!id) {
            return res.status(400).json({
                error: "Record ID is required",
                received: req.params
            });
        }

        // Check if record exists
        const checkResult = await pool.query(
            `SELECT "PK_KTO_KAS_KASSE" FROM "COMPANY"."T_KTO_KAS_KASSE" WHERE "PK_KTO_KAS_KASSE" = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                error: "Record not found",
                details: `No kasse record with id = ${id}`
            });
        }

        // Build dynamic update query based on provided fields
        const updateFields = [];
        const updateValues = [];
        let paramCount = 1;

        // Helper function to add field to update
        const addField = (field, value) => {
            if (value !== undefined) {
                updateFields.push(`"${field}" = $${paramCount}`);
                updateValues.push(value);
                paramCount++;
            }
        };

        // Add all possible fields to update
        addField("FK_STD_KTO_KONTOTYP", fk_std_kto_kontotyp);
        addField("FK_EIN_AUS", fk_ein_aus);
        addField("DATUM", datum);
        addField("BETRAG", betrag);
        addField("BUCHUNGSTEXT", buchungstext);
        addField("COMM", comm);
        addField("JAHR", jahr);
        addField("FK_MAIN_KEY", fk_main_key);
        addField("FK_KTO_BANKKONTO", fk_kto_bankkonto);
        addField("FREMDWAEHRUNGSBETRAG", fremdwaehrungsbetrag);
        addField("FK_BAS_MON_FREMDWAEHRUNG", fk_bas_mon_fremdwaehrung);
        addField("FK_BAS_KAL_ARBEITSTAG", fk_bas_kal_arbeitstag);
        addField("FK_BAS_KAT_KATEGORIE", fk_bas_kat_kategorie);
        addField("FK_STD_VERW_VERWENDUNGSZWECK", fk_std_verw_verwendungszweck);
        addField("FK_INV_INVENTAR", fk_inv_inventar);
        addField("FK_LOC_LOCATION", fk_loc_location);
        addField("FK_MAIN_KEY_BANKKONTO", fk_main_key_bankkonto);
        addField("DATUM_DUPL_OK", datum_dupl_ok);
        addField("DUPL_BEMERKUNG", dupl_bemerkung);
        addField("FK_CONTR_DUPL_STATUS", fk_contr_dupl_status);
        addField("FK_STEU_STEUER_MONAT", fk_steu_steuer_monat);
        addField("FK_STEU_STEUER_VORANMELDG", fk_steu_steuer_voranmeldg);
        addField("DATUM_STEUERB_UEBERG", datum_steuerb_ueberg);
        addField("DATUM_FINANZAMT_UEBERG", datum_finanzamt_ueberg);
        addField("GESAMT_BETRAG", gesamt_betrag);
        addField("GEBUEHREN", gebuehren);
        addField("DATUM_LEX_BUCHUNG_OK", datum_lex_buchung_ok);
        addField("DATUM_VAR", datum_var);
        addField("FK_STD_CONTR_STATUS_KAT", fk_std_contr_status_kat);
        addField("FK_STD_CONTR_STATUS_VERW", fk_std_contr_status_verw);
        addField("DATUM_STATUS_VERW", datum_status_verw);
        addField("DATUM_STATUS_KAT", datum_status_kat);
        addField("KONTOSTAND_EUR", kontostand_eur);
        addField("FK_BAS_STEU_STEUER_SATZ_FRMDW", fk_bas_steu_steuer_satz_frmdw);
        addField("FRMDW_NETTO_BETRAG", frmdw_netto_betrag);
        addField("FRMDW_MWST_BETRAG", frmdw_mwst_betrag);
        addField("FRMDW_BRUTTO_BETRAG", frmdw_brutto_betrag);
        addField("FRMDW_BRUTTO_INCL_TRINKG", frmdw_brutto_incl_trinkg);
        addField("FK_BAS_MON_FRMDW", fk_bas_mon_frmdw);
        addField("FK_BAS_MON_FRMDW_MWST_SATZ", fk_bas_mon_frmdw_mwst_satz);
        addField("DUMMY", dummy);
        addField("FK_KON_IM_AUFTRAG_VON", fk_kon_im_auftrag_von);
        addField("OFFENER_BETRAG_CHECK", offener_betrag_check);
        addField("OFFENER_BETRAG_DATUM", offener_betrag_datum);
        addField("OFFENER_BETRAG_BEMERKUNG", offener_betrag_bemerkung);
        addField("SORT1", sort1);
        addField("TEXT_BUCHUNGSDATUM", text_buchungsdatum);
        addField("TEXT_BUCHUNGSDATUM_DATE", text_buchungsdatum_date);
        addField("TEXT_BUCHUNGSDATUM_TIME", text_buchungsdatum_time);
        addField("TEXT_BUCHUNGSDATUM_CHAR", text_buchungsdatum_char);
        addField("MODIFIED_BY", modified_by);
        addField("MODIFIED_AT", new Date());
        addField("FK_MDT_MANDANT", fk_mdt_mandant);
        addField("DATUM_ALL_OK", datum_all_ok);
        addField("DATUM_ZUORD_KTO_AUSZUG_OK", datum_zuord_kto_auszug_ok);
        addField("FINAL_CNT_ZUORD_BELEGE", final_cnt_zuord_belege);
        addField("DATUM_LOAD", datum_load);
        addField("FK_KTO_BANKKONTO_ZIEL", fk_kto_bankkonto_ziel);
        addField("FK_KTO_BANKKONTO_HERKUNFT", fk_kto_bankkonto_herkunft);

        // Check if any fields were provided to update
        if (updateFields.length === 0) {
            return res.status(400).json({
                error: "No fields provided for update",
                details: "At least one field must be provided to update the record"
            });
        }

        // Add the ID as the last parameter
        updateValues.push(id);
        
        const updateQuery = `
            UPDATE "COMPANY"."T_KTO_KAS_KASSE" 
            SET ${updateFields.join(', ')}
            WHERE "PK_KTO_KAS_KASSE" = $${paramCount}
            RETURNING "PK_KTO_KAS_KASSE", "MODIFIED_AT"
        `;

        const result = await pool.query(updateQuery, updateValues);

        if (result.rows.length === 0) {
            return res.status(500).json({
                error: "Failed to update kasse record",
                details: "No record was updated"
            });
        }

        res.status(200).json({
            success: true,
            message: "Record updated successfully",
            kasseRecordId: result.rows[0].PK_KTO_KAS_KASSE,
            modifiedAt: result.rows[0].MODIFIED_AT,
            updatedFields: updateFields.length
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to update kasse record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.put('/belegpos/update/:id', async (req, res) => {
  let client;

  try {
    const { id } = req.params;
    const body = req.body;

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'Record ID is required'
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    // Loop through all fields sent by the frontend
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        setClauses.push(`"${key.toUpperCase()}" = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No fields provided for update'
      });
    }

    // Add ID as last parameter
    values.push(id);

    const query = `
      UPDATE "COMPANY"."T_INP_BELEGE_POS_ALL"
      SET ${setClauses.join(', ')}
      WHERE "PK_INP_BELEGE_POS_ALL" = $${paramIndex}
      RETURNING "PK_INP_BELEGE_POS_ALL", "MODIFIED_AT"
    `;

    const result = await client.query(query, values);
    await client.query('COMMIT');

    res.json({
      status: 'success',
      updatedId: result.rows[0].PK_INP_BELEGE_POS_ALL,
      modifiedAt: result.rows[0].MODIFIED_AT,
      updatedFields: setClauses
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Database error:', err);

    res.status(500).json({
      status: 'error',
      message: 'Failed to update record',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

app.post('/update-kon_geschaeftspartner_rel', async (req, res) => {
  let client;
  try {
    const {
      id,  // PK_REL_KON_GESCHAEFTSPARTNER_KONTAKT
      fk_kon_geschaeftspartner,
      fk_kon_kontakt,
      fk_adr_adresse,
      created_by,
      created_at,
      modified_by,
      modified_at,
      fk_org_unit,
      fk_kon_person,
      fk_loc_location,
      fk_adr_adresse_schnell,
      fk_inp_belege_all,
      valid,
      valid_from,
      valid_to,
      bemerkungen,
      bemerkungen_clob,
      fk_firm_mitarbeiter,
      fk_mdt_mandant,
      fk_bild_bilder
    } = req.body;
    
    console.log('Received data:', req.body);
    
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'ID (PK_REL_KON_GESCHAEFTSPARTNER_KONTAKT) is required'
      });
    }

    client = await pool.connect();    
    await client.query('BEGIN');

    // Build dynamic UPDATE query based on provided parameters
    const updateFields = [];
    const queryParams = [];
    let paramCount = 0;

    // Add each field to update if provided in request
    const fieldMappings = {
      fk_kon_geschaeftspartner: '"FK_KON_GESCHAEFTSPARTNER"',
      fk_kon_kontakt: '"FK_KON_KONTAKT"',
      fk_adr_adresse: '"FK_ADR_ADRESSE"',
      created_by: '"CREATED_BY"',
      created_at: '"CREATED_AT"',
      modified_by: '"MODIFIED_BY"',
      modified_at: '"MODIFIED_AT"',
      fk_org_unit: '"FK_ORG_UNIT"',
      fk_kon_person: '"FK_KON_PERSON"',
      fk_loc_location: '"FK_LOC_LOCATION"',
      fk_adr_adresse_schnell: '"FK_ADR_ADRESSE_SCHNELL"',
      fk_inp_belege_all: '"FK_INP_BELEGE_ALL"',
      valid: '"VALID"',
      valid_from: '"VALID_FROM"',
      valid_to: '"VALID_TO"',
      bemerkungen: '"BEMERKUNGEN"',
      bemerkungen_clob: '"BEMERKUNGEN_CLOB"',
      fk_firm_mitarbeiter: '"FK_FIRM_MITARBEITER"',
      fk_mdt_mandant: '"FK_MDT_MANDANT"',
     fk_bild_bilder: '"FK_BILD_BILDER"'
    };

    // Build SET clause dynamically
    Object.keys(fieldMappings).forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        paramCount++;
        updateFields.push(`${fieldMappings[field]} = $${paramCount}`);
        queryParams.push(req.body[field]);
      }
    });

    // Check if there are any fields to update
    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields provided for update'
      });
    }

    // Add ID parameter for WHERE clause
    paramCount++;
    queryParams.push(id);

    const updateQuery = `
      UPDATE "COMPANY"."T_REL_KON_GESCHAEFTSPARTNER_KONTAKT" 
      SET ${updateFields.join(', ')}
      WHERE "PK_REL_KON_GESCHAEFTSPARTNER_KONTAKT" = $${paramCount}
      RETURNING *
    `;

    console.log('Update query:', updateQuery);
    console.log('Query parameters:', queryParams);

    const result = await client.query(updateQuery, queryParams);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'Record not found with the provided ID'
      });
    }

    console.log('Update result:', result.rows[0]);
    
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: 'Geschäftspartner-Kontakt relation updated successfully',
      updatedRecord: result.rows[0],
      updatedFields: updateFields.length
    });
    
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Database error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      table: err.table,
      schema: err.schema
    });
    
    // Spezifische Fehlermeldungen
    let errorMessage = 'Failed to update geschäftspartner-kontakt relation';
    if (err.code === '23503') {
      errorMessage = 'Foreign key violation - referenced record does not exist';
    } else if (err.code === '23505') {
      errorMessage = 'Unique constraint violation - duplicate record';
    } else if (err.code === '42703') {
      errorMessage = 'Column does not exist - check column names';
    } else if (err.code === '42P01') {
      errorMessage = 'Table or view does not exist - check table name';
    } else if (err.code === '22007') {
      errorMessage = 'Invalid date format';
    } else if (err.code === '22P02') {
      errorMessage = 'Invalid data type for one of the parameters';
    }
    
    res.status(500).json({
      status: 'error',
      message: errorMessage,
      error: err.message,
      code: err.code
    });
  } finally {
    if (client) client.release();
  }
});


app.post('/update-question', async (req, res) => {
  let client;
  try {
    const { id, frage, fkStdLehrTheme, okDatum } = req.body;
    
    console.log('Received data:', { id, frage, fkStdLehrTheme, okDatum });
    
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'ID (PK_LEHR_FRAGE) is required'
      });
    }

    client = await pool.connect();    
  

    await client.query('BEGIN');

    // Verwende COALESCE für optionale Updates
    const result = await client.query(
      `UPDATE "COMPANY"."T_LEHR_FRAGE" 
       SET "FRAGE" = COALESCE($1, "FRAGE"), 
           "FK_STD_LEHR_THEME" = COALESCE($2, "FK_STD_LEHR_THEME"), "DATUM_OK" = $4
       WHERE "PK_LEHR_FRAGE" = $3
       RETURNING "PK_LEHR_FRAGE", "FRAGE", "FK_STD_LEHR_THEME"`,
      [frage, fkStdLehrTheme, id, okDatum]
    );

    console.log('Update result:', result.rows[0]);
    
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: 'Question updated successfully',
      updatedQuestion: result.rows[0]
    });
    
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Database error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      table: err.table,
      schema: err.schema
    });
    
    // Spezifische Fehlermeldungen
    let errorMessage = 'Failed to update question';
    if (err.code === '23503') {
      errorMessage = 'Invalid theme ID - theme does not exist';
    } else if (err.code === '42703') {
      errorMessage = 'Column does not exist - check column names';
    } else if (err.code === '42P01') {
      errorMessage = 'Table does not exist - check table name';
    }
    
    res.status(500).json({
      status: 'error',
      message: errorMessage,
      error: err.message,
      code: err.code
    });
  } finally {
    if (client) client.release();
  }
});


app.post('/update-kontakt', async (req, res) => {
  let client;
  try {
    const {
      id,
      EMAIL,
      FESTNETZNUMMER,
      MOBILNUMMER,
      WEBSEITE,
      FAX,
      BESCHREIBUNG,
      TELEX
    } = req.body;

    console.log('Received data:', {
      id,
      EMAIL,
      FESTNETZNUMMER,
      MOBILNUMMER,
      WEBSEITE,
      FAX,
      BESCHREIBUNG,
      TELEX
    });

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'ID (PK_KON_KONTAKT) is required'
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE "COMPANY"."T_KON_KONTAKT"
       SET "EMAIL" = $2,
           "FESTNETZNUMMER" = $3,
           "MOBILNUMMER" = $4,
           "WEBSEITE" = $5,
           "FAX" = $6,
           "BESCHREIBUNG" = $7,
           "TELEX" = $8
       WHERE "PK_KON_KONTAKT" = $1
       RETURNING "PK_KON_KONTAKT", "EMAIL", "FESTNETZNUMMER", "MOBILNUMMER", "WEBSEITE", "FAX", "BESCHREIBUNG", "TELEX"`,
      [id, EMAIL, FESTNETZNUMMER, MOBILNUMMER, WEBSEITE, FAX, BESCHREIBUNG, TELEX]
    );

    console.log('Update result:', result.rows[0]);

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: 'Kontakt updated successfully',
      updatedKontakt: result.rows[0]
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Database error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      table: err.table,
      schema: err.schema
    });

    let errorMessage = 'Failed to update kontakt';
    if (err.code === '23503') {
      errorMessage = 'Foreign key constraint failed';
    } else if (err.code === '42703') {
      errorMessage = 'Column does not exist - check column names';
    } else if (err.code === '42P01') {
      errorMessage = 'Table does not exist - check table name';
    }

    res.status(500).json({
      status: 'error',
      message: errorMessage,
      error: err.message,
      code: err.code
    });
  } finally {
    if (client) client.release();
  }
});

app.post("/std/insert", async (req, res) => {
    try {
        const { 
            stdName,
            stdNameEng,
            stdValue,
            fkStdGroup,
            comm,
            colorBlue,
            colorRed,
            colorSpecial,
            colorYellow,
            mark,
            sort,
            valid,
            modifiedBy
        } = req.body;

        // Validate required fields
        if (!stdName || !stdValue || !fkStdGroup) {
            return res.status(400).json({
                success: false,
                error: "stdName, stdValue, and fkStdGroup are required"
            });
        }

        // Set default values for required fields if not provided
        const currentTimestamp = new Date();
        const defaultCreatedBy = modifiedBy || 'system';
        const defaultFkMandant = 1;
        
        // Convert boolean values to 1/0 for double precision
        const colorBlueNum = colorBlue ? 1 : 0;
        const colorRedNum = colorRed ? 1 : 0;
        const colorSpecialNum = colorSpecial ? 1 : 0;
        const colorYellowNum = colorYellow ? 1 : 0;
        const markNum = mark ? 1 : 0;
        const validNum = valid ? 1 : 0;

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_STD" (
                "COLOR_BLUE",
                "COLOR_RED",
                "color_special",
                "COLOR_YELLOW",
                "COMM",
                "CREATED_AT",
                "CREATED_BY",
                "FK_MDT_MANDANT",
                "FK_STD_BAS_FARBE",
                "FK_STD_GROUP",
                "MARK",
                "MODIFIED_AT",
                "MODIFIED_BY",
                "SORT",
                "STD_NAME",
                "STD_NAME_ENG",
                "STD_VALUE",
                "VALID",
                "VALID_FROM",
                "VALID_TO"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
            ) RETURNING "PK_STD"`,
            [
                colorBlueNum,
                colorRedNum,
                colorSpecialNum,
                colorYellowNum,
                comm || null,
                currentTimestamp,
                defaultCreatedBy,
                defaultFkMandant,
                null, // FK_STD_BAS_FARBE
                fkStdGroup,
                markNum,
                currentTimestamp,
                defaultCreatedBy,
                sort || 0,
                stdName,
                stdNameEng || null,
                stdValue,
                validNum,
                currentTimestamp, // VALID_FROM
                null // VALID_TO
            ]
        );

        res.status(201).json({
            success: true,
            stdRecordId: result.rows[0].PK_STD,
            message: "Standard record created successfully"
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert standard record",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

// POST - Create new evaluation
app.post('/lehr-bewertung-schueler/insert', async (req, res) => {
    try {
        const body = req.body;

        const sql = `
            INSERT INTO "COMPANY"."T_LEHR_BEWERTUNG_SCHUELER" (
                "FK_LEHR_EINSENDEAUFGABE_LEHRER",
                "FK_MDT_MANDANT",
                "CREATED_AT",
                "MODIFIED_AT",
                "DATUM_BEWERTUNG",
                "FK_STD_BEW_BEWERTUNGSTYP",
                "COMM",
                "STAERKEN_UND_POSITIVE_ASPEKTE",
                "VERBESSERUNGSPOTENTIAL",
                "EMPFEHLUNG_NAECHSTE_SCHRITTE",
                "GESAMTURTEIL",
                "FK_KON_PERSON_SCHUELER",
                "INHALT_SKALA",
                "INHALT_TEXT",
                "INHALT_WERT",
                "KORREKTHEIT_SKALA",
                "KORREKTHEIT_TEXT",
                "KORREKTHEIT_WERT",
                "VERFUEGBARE_SPRACHLICHE_MITTEL_SKALA",
                "VERFUEGBARE_SPRACHLICHE_MITTEL_TEXT",
                "VERFUEGBARE_SPRACHLICHE_MITTEL_WERT",
                "GESAMTEINDRUCK_SKALA",
                "GESAMTEINDRUCK_TEXT",
                "GESAMTEINDRUCK_WERT"
            ) VALUES (
                $1, $2,
                CURRENT_DATE,
                CURRENT_DATE,
                $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16,
                $17, $18, $19,
                $20, $21, $22
            )
            RETURNING "PK_LEHR_BEWERTUNG_SCHUELER", "CREATED_AT", "MODIFIED_AT";
        `;

        const params = [
            parseInt(body.FK_LEHR_EINSENDEAUFGABE_LEHRER) || null,
            parseInt(body.FK_MDT_MANDANT) || null,
            formatDateForDB(body.DATUM_BEWERTUNG),
            parseInt(body.FK_STD_BEW_BEWERTUNGSTYP) || null,
            body.COMM || null,
            body.STAERKEN_UND_POSITIVE_ASPEKTE || null,
            body.VERBESSERUNGSPOTENTIAL || null,
            body.EMPFEHLUNG_NAECHSTE_SCHRITTE || null,
            body.GESAMTURTEIL || null,
            parseInt(body.FK_KON_PERSON_SCHUELER) || null,
            body.INHALT_SKALA || null,
            body.INHALT_TEXT || null,
            parseFloat(body.INHALT_WERT) || null,
            body.KORREKTHEIT_SKALA || null,
            body.KORREKTHEIT_TEXT || null,
            parseFloat(body.KORREKTHEIT_WERT) || null,
            body.VERFUEGBARE_SPRACHLICHE_MITTEL_SKALA || null,
            body.VERFUEGBARE_SPRACHLICHE_MITTEL_TEXT || null,
            parseFloat(body.VERFUEGBARE_SPRACHLICHE_MITTEL_WERT) || null,

            // NEW FIELDS:
            body.GESAMTEINDRUCK_SKALA || null,
            body.GESAMTEINDRUCK_TEXT || null,
            parseFloat(body.GESAMTEINDRUCK_WERT) || null
        ];

        console.log('INSERT with EXTRACT(EPOCH FROM NOW())');
        console.log('Params:', params);

        const { rows } = await pool.query(sql, params);
        res.status(201).json(rows[0]);

    } catch (err) {
        console.error('INSERT error:', err);
        res.status(500).json({ error: 'insert_failed', details: err.message });
    }
});


// GET all evaluations
app.get('/lehr-bewertung-schueler/getAll', async (req, res) => {
    const sql = `
        SELECT 
            sch."PK_LEHR_BEWERTUNG_SCHUELER",
            sch."FK_LEHR_EINSENDEAUFGABE_LEHRER",
            sch."FK_MDT_MANDANT",
            sch."CREATED_AT",
            sch."MODIFIED_AT",
            sch."DATUM_BEWERTUNG",
            sch."FK_STD_BEW_BEWERTUNGSTYP",
            sch."COMM",
            sch."STAERKEN_UND_POSITIVE_ASPEKTE",
            sch."VERBESSERUNGSPOTENTIAL",
            sch."EMPFEHLUNG_NAECHSTE_SCHRITTE",
            sch."GESAMTURTEIL",
            sch."FK_KON_PERSON_SCHUELER",
            sch."INHALT_SKALA",
            sch."INHALT_TEXT",
            sch."INHALT_WERT",
            sch."KORREKTHEIT_SKALA",
            sch."KORREKTHEIT_TEXT",
            sch."KORREKTHEIT_WERT",
            sch."VERFUEGBARE_SPRACHLICHE_MITTEL_SKALA",
            sch."VERFUEGBARE_SPRACHLICHE_MITTEL_TEXT",
            sch."VERFUEGBARE_SPRACHLICHE_MITTEL_WERT",
            lehr."FK_KON_PERSON_LEHRER",
            pers."VORNAME",
            pers."NACHNAME"
        FROM "COMPANY"."T_LEHR_BEWERTUNG_SCHUELER" sch
          left join "COMPANY"."T_LEHR_EINSENDEAUFGABE_LEHRER" lehr on sch."FK_LEHR_EINSENDEAUFGABE_LEHRER" = lehr."PK_LEHR_EINSENDEAUFGABE_LEHRER"
 left join "COMPANY"."T_KON_PERSON" pers on pers."PK_KON_PERSON" = lehr."FK_KON_PERSON_LEHRER"
        ORDER BY "DATUM_BEWERTUNG" DESC, "CREATED_AT" DESC
        LIMIT 100;
    `;
    
    try {
        const { rows } = await pool.query(sql);
        
        // Convert Unix timestamps to ISO strings for frontend
        const processedRows = rows.map(row => {
            const processedRow = { ...row };
            
            // Convert Unix timestamps to ISO strings
            if (row.CREATED_AT) {
                processedRow.CREATED_AT = new Date(row.CREATED_AT * 1000).toISOString();
            }
            if (row.MODIFIED_AT) {
                processedRow.MODIFIED_AT = new Date(row.MODIFIED_AT * 1000).toISOString();
            }
            if (row.DATUM_BEWERTUNG) {
                // Convert to YYYY-MM-DD format for date input
                const date = new Date(row.DATUM_BEWERTUNG * 1000);
                processedRow.DATUM_BEWERTUNG = date.toISOString().split('T')[0];
            }
            
            return processedRow;
        });
        
        console.log(`Fetched ${processedRows.length} evaluations`);
        res.status(200).json(processedRows);
    } catch (err) {
        console.error('GET ALL T_LEHR_BEWERTUNG_SCHUELER error:', err);
        res.status(500).json({ error: 'fetch_failed', details: err.message });
    }
});


// PUT - Update evaluation





app.get('/rel-org-person-role_selected', async (req, res) => { const { PK_REL_ORG_ORG_UNIT_PERSON_PERSON_ROLE, FK_KON_PERSON, PK_REL_ORG_ORG_UNIT_ORG_UNIT, FK_ORG_UNIT, FK_STD_KON_PERSON_ROLE, PK_REL_KON_PERSON_ROLE } = req.query; 
// Dynamische WHERE-Bedingungen 
const conditions = []; const params = []; function addCondition(field, value) { if (value !== undefined) { params.push(value); conditions.push(`"${field}" = $${params.length}`); } } addCondition("PK_REL_ORG_ORG_UNIT_PERSON_PERSON_ROLE", PK_REL_ORG_ORG_UNIT_PERSON_PERSON_ROLE); addCondition("FK_KON_PERSON", FK_KON_PERSON); addCondition("PK_REL_ORG_ORG_UNIT_ORG_UNIT", PK_REL_ORG_ORG_UNIT_ORG_UNIT); addCondition("FK_ORG_UNIT", FK_ORG_UNIT); addCondition("FK_STD_KON_PERSON_ROLE", FK_STD_KON_PERSON_ROLE); addCondition("PK_REL_KON_PERSON_ROLE", PK_REL_KON_PERSON_ROLE); const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''; const sql = ` SELECT * FROM "COMPANY"."V_REL_ORG_ORG_UNIT_PERSON_PERSON_ROLE" ${where} `; try { const { rows } = await pool.query(sql, params); res.json(rows); } catch (err) { console.error('SELECT error:', err); res.status(500).json({ error: 'select_failed' }); } }); 

app.post('/update-person', async (req, res) => {
  let client;
  try {
    const {
      id,
      NACHNAME,
      VORNAME,
      BEMERKUNG,
      CREATED_BY,
      CREATED_AT,
      MODIFIED_BY,
      MODIFIED_AT,
      GEBURTSDATUM,
      STERBEDATUM,
      FK_MDT_MANDANT,
      FK_STD_KON_PERSON_GESCHLECHT,
      FK_ADR_GEBURTSORT,
      BESCHREIBUNG,
      GEBURTSNAME,
      TITEL,
      ADELSTITEL,
      FK_ADR_STERBEORT,
      RUFNAME,
      NR_AHNENTAFEL_TEMP,
      FK_PERSON_OLD,
      PERSON_BILD,
      USER_NAME,
      DUPLIKAT_OK_DATE,
      FK_KON_DUPLIKAT_NR,
      GEBURTSJAHR,
      STERBEJAHR,
      LINK
    } = req.body;

    console.log('Received data for person update:', {
      id,
      NACHNAME,
      VORNAME,
      BEMERKUNG,
      CREATED_BY,
      CREATED_AT,
      MODIFIED_BY,
      MODIFIED_AT,
      GEBURTSDATUM,
      STERBEDATUM,
      FK_MDT_MANDANT,
      FK_STD_KON_PERSON_GESCHLECHT,
      FK_ADR_GEBURTSORT,
      BESCHREIBUNG,
      GEBURTSNAME,
      TITEL,
      ADELSTITEL,
      FK_ADR_STERBEORT,
      RUFNAME,
      NR_AHNENTAFEL_TEMP,
      FK_PERSON_OLD,
      PERSON_BILD,
      USER_NAME,
      DUPLIKAT_OK_DATE,
      FK_KON_DUPLIKAT_NR
    });

    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'ID (PK_KON_PERSON) is required'
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE "COMPANY"."T_KON_PERSON"
       SET "NACHNAME" = $2,
           "VORNAME" = $3,
           "BEMERKUNG" = $4,
           "CREATED_BY" = $5,
           "CREATED_AT" = $6,
           "MODIFIED_BY" = $7,
           "MODIFIED_AT" = $8,
           "GEBURTSDATUM" = $9,
           "STERBEDATUM" = $10,
           "FK_MDT_MANDANT" = $11,
           "FK_STD_KON_PERSON_GESCHLECHT" = $12,
           "FK_ADR_GEBURTSORT" = $13,
           "BESCHREIBUNG" = $14,
           "GEBURTSNAME" = $15,
           "TITEL" = $16,
           "ADELSTITEL" = $17,
           "FK_ADR_STERBEORT" = $18,
           "RUFNAME" = $19,
           "NR_AHNENTAFEL_TEMP" = $20,
           "FK_PERSON_OLD" = $21,
           "PERSON_BILD" = $22,
           "USER_NAME" = $23,
           "DUPLIKAT_OK_DATE" = $24,
           "FK_KON_DUPLIKAT_NR" = $25,
"GEBURTSJAHR" = $26,
"STERBEJAHR" = $27,
"LINK" = $28
       WHERE "PK_KON_PERSON" = $1
       RETURNING *`,
      [
        id,
        NACHNAME,
        VORNAME,
        BEMERKUNG,
        CREATED_BY,
        CREATED_AT,
        MODIFIED_BY,
        MODIFIED_AT,
        GEBURTSDATUM,
        STERBEDATUM,
        FK_MDT_MANDANT,
        FK_STD_KON_PERSON_GESCHLECHT,
        FK_ADR_GEBURTSORT,
        BESCHREIBUNG,
        GEBURTSNAME,
        TITEL,
        ADELSTITEL,
        FK_ADR_STERBEORT,
        RUFNAME,
        NR_AHNENTAFEL_TEMP,
        FK_PERSON_OLD,
        PERSON_BILD,
        USER_NAME,
        DUPLIKAT_OK_DATE,
        FK_KON_DUPLIKAT_NR,
      GEBURTSJAHR,
      STERBEJAHR,
      LINK
      ]
    );

    console.log('Update result:', result.rows[0]);

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: 'Person updated successfully',
      updatedPerson: result.rows[0]
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Database error details:', {
      message: err.message,
      code: err.code,
      detail: err.detail,
      table: err.table,
      schema: err.schema
    });

    let errorMessage = 'Failed to update person';
    if (err.code === '23503') {
      errorMessage = 'Foreign key constraint failed';
    } else if (err.code === '42703') {
      errorMessage = 'Column does not exist - check column names';
    } else if (err.code === '42P01') {
      errorMessage = 'Table does not exist - check table name';
    }

    res.status(500).json({
      status: 'error',
      message: errorMessage,
      error: err.message,
      code: err.code
    });
  } finally {
    if (client) client.release();
  }
});


// Process documents endpoint
app.post("/process-documents-bilder", async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { anz_pk_inp_belege, PK_INP_BELEGE_ALL, first_PK_BILD_BILDER, step } = req.body;

        // Validate parameters
        if (!anz_pk_inp_belege || !PK_INP_BELEGE_ALL || !first_PK_BILD_BILDER) {
            return res.status(400).json({
                error: "Missing required parameters",
                required: ["anz_pk_inp_belege", "PK_INP_BELEGE_ALL", "first_PK_BILD_BILDER"]
            });
        }

        // Convert to integers
        const anzPk = parseInt(anz_pk_inp_belege);
        const pkInp = parseInt(PK_INP_BELEGE_ALL);
        const firstPk = parseInt(first_PK_BILD_BILDER);

        if (isNaN(anzPk) || isNaN(pkInp) || isNaN(firstPk)) {
            return res.status(400).json({ error: "Parameters must be integers" });
        }

        await client.query('BEGIN');

        const results = {};
        let newPks = [];

        // Determine which steps to execute
        const stepsToExecute = [];
        if (step === 6 || !step) {
            // Execute all steps (6 = all steps)
            stepsToExecute.push(1, 2, 3, 4, 5);
        } else if (step >= 1 && step <= 5) {
            // Execute specific step
            stepsToExecute.push(step);
        } else {
            return res.status(400).json({ error: "Invalid step parameter. Use 1-5 for individual steps or 6 for all steps" });
        }

        // Step 1: Insert into T_INP_BELEGE_ALL
        if (stepsToExecute.includes(1)) {
            const insertResult = await client.query(`
                INSERT INTO "COMPANY"."T_INP_BELEGE_ALL" ("BELEGNUMMER")
                SELECT generate_series(1, $1)
                RETURNING "PK_INP_BELEGE_ALL"
            `, [anzPk]);

            newPks = insertResult.rows.map(row => row.PK_INP_BELEGE_ALL);
            results.new_document_pks = newPks;
            results.step1_completed = true;
            results.step1_message = `Inserted ${newPks.length} documents`;
        }

        // Step 2: Insert into T_REL_INP_INP_BELEGE_ALL_INP_BELEGE_ALL
        if (stepsToExecute.includes(2)) {
            if (newPks.length === 0 && stepsToExecute.includes(1)) {
                // If step 1 was executed but no documents were created
                results.step2_completed = false;
                results.step2_message = "No documents available to create relations";
            } else if (newPks.length === 0 && !stepsToExecute.includes(1)) {
                // If step 1 wasn't executed in this request
                return res.status(400).json({ 
                    error: "Cannot execute step 2 without existing documents. Execute step 1 first or use step 6 for all steps." 
                });
            } else {
                const placeholders = newPks.map((_, index) => `$${index + 2}`).join(',');
                const relationResult = await client.query(`
                    INSERT INTO "COMPANY"."T_REL_INP_INP_BELEGE_ALL_INP_BELEGE_ALL" 
                    ("FK_INP_BELEGE_ALL1", "FK_INP_BELEGE_ALL2")
                    SELECT $1, "PK_INP_BELEGE_ALL"
                    FROM "COMPANY"."T_INP_BELEGE_ALL"
                    WHERE "PK_INP_BELEGE_ALL" IN (${placeholders})
                `, [pkInp, ...newPks]);

                results.relations_created = relationResult.rowCount;
                results.step2_completed = true;
                results.step2_message = `Created ${relationResult.rowCount} document relations`;
            }
        }

        // Step 3: Update T_INP_BELEGE_ALL
        if (stepsToExecute.includes(3)) {
            if (newPks.length === 0 && stepsToExecute.includes(1)) {
                results.step3_completed = false;
                results.step3_message = "No documents available to update";
            } else if (newPks.length === 0 && !stepsToExecute.includes(1)) {
                return res.status(400).json({ 
                    error: "Cannot execute step 3 without existing documents. Execute step 1 first or use step 6 for all steps." 
                });
            } else {
                const placeholders = newPks.map((_, index) => `$${index + 1}`).join(',');
                const updateResult = await client.query(`
                    UPDATE "COMPANY"."T_INP_BELEGE_ALL" 
                    SET "FK_ABL_ORDNER_PAGE" = 391, "BEZEICHNUNG" = 'Visitenkarten' 
                    WHERE "PK_INP_BELEGE_ALL" IN (${placeholders})
                `, newPks);

                results.documents_updated = updateResult.rowCount;
                results.step3_completed = true;
                results.step3_message = `Updated ${updateResult.rowCount} documents with folder ID 391 and description 'Visitenkarten'`;
            }
        }

        // Step 4: First insert into T_REL_INP_INP_BELEGE_ALL_BILD_BILDER
        if (stepsToExecute.includes(4)) {
            if (newPks.length === 0 && stepsToExecute.includes(1)) {
                results.step4_completed = false;
                results.step4_message = "No documents available to create image relations";
            } else if (newPks.length === 0 && !stepsToExecute.includes(1)) {
                return res.status(400).json({ 
                    error: "Cannot execute step 4 without existing documents. Execute step 1 first or use step 6 for all steps." 
                });
            } else {
                // Check if step 2 was executed (needed for this query)
                if (!stepsToExecute.includes(2) && step !== 6) {
                    const relationCheck = await client.query(`
                        SELECT COUNT(*) FROM "COMPANY"."T_REL_INP_INP_BELEGE_ALL_INP_BELEGE_ALL" 
                        WHERE "FK_INP_BELEGE_ALL1" = $1 AND "FK_INP_BELEGE_ALL2" IN (${newPks.map((_, i) => `$${i+2}`).join(',')})
                    `, [pkInp, ...newPks]);
                    
                    if (parseInt(relationCheck.rows[0].count) === 0) {
                        return res.status(400).json({ 
                            error: "Cannot execute step 4 without document relations. Execute step 2 first or use step 6 for all steps." 
                        });
                    }
                }

                const placeholders = newPks.map((_, index) => `$${index + 2}`).join(',');
                const firstImageResult = await client.query(`
                    INSERT INTO "COMPANY"."T_REL_INP_INP_BELEGE_ALL_BILD_BILDER" 
                    ("FK_BILD_BILDER", "FK_INP_BELEGE_ALL") 
                    WITH bas_ AS (
                        SELECT * FROM "COMPANY"."T_REL_INP_INP_BELEGE_ALL_BILD_BILDER" 
                        WHERE "FK_INP_BELEGE_ALL" = $1
                    )
                    SELECT bas_."FK_BILD_BILDER", rel."FK_INP_BELEGE_ALL2"
                    FROM "COMPANY"."T_REL_INP_INP_BELEGE_ALL_INP_BELEGE_ALL" rel, bas_
                    WHERE rel."FK_INP_BELEGE_ALL1" = bas_."FK_INP_BELEGE_ALL"
                    AND rel."FK_INP_BELEGE_ALL2" IN (${placeholders})
                `, [pkInp, ...newPks]);

                results.first_image_relations = firstImageResult.rowCount;
                results.step4_completed = true;
                results.step4_message = `Created ${firstImageResult.rowCount} first image relations`;
            }
        }

        // Step 5: Second insert into T_REL_INP_INP_BELEGE_ALL_BILD_BILDER
        if (stepsToExecute.includes(5)) {
            if (newPks.length === 0 && stepsToExecute.includes(1)) {
                results.step5_completed = false;
                results.step5_message = "No documents available to create image relations";
            } else if (newPks.length === 0 && !stepsToExecute.includes(1)) {
                return res.status(400).json({ 
                    error: "Cannot execute step 5 without existing documents. Execute step 1 first or use step 6 for all steps." 
                });
            } else {
                const secondImageResult = await client.query(`
                    INSERT INTO "COMPANY"."T_REL_INP_INP_BELEGE_ALL_BILD_BILDER" 
                    ("FK_INP_BELEGE_ALL", "FK_BILD_BILDER")
                    WITH max_nr_ AS (SELECT $1 AS ma),
                    bas_ AS (
                        SELECT row_number() OVER (PARTITION BY 1) AS rnr, b.* 
                        FROM "COMPANY"."T_REL_INP_INP_BELEGE_ALL_INP_BELEGE_ALL" b, max_nr_ 
                        WHERE "FK_INP_BELEGE_ALL1" = $2
                    ),
                    bild_ AS (
                        SELECT generate_series($3, $3 + ma - 1) AS id, 
                               generate_series(1, ma) AS rnr 
                        FROM max_nr_
                    )
                    SELECT bas_."FK_INP_BELEGE_ALL2", bild_.id
                    FROM bas_, bild_
                    WHERE bas_.rnr = bild_.rnr
                `, [anzPk, pkInp, firstPk]);

                results.second_image_relations = secondImageResult.rowCount;
                results.step5_completed = true;
                results.step5_message = `Created ${secondImageResult.rowCount} second image relations`;
            }
        }

        await client.query('COMMIT');

        // Build response message based on executed steps
        let message = "";
        if (step === 6 || !step) {
            message = "All steps executed successfully";
        } else {
            const stepNames = {
                1: "Document insertion",
                2: "Document relations creation", 
                3: "Document update",
                4: "First image relations creation",
                5: "Second image relations creation"
            };
            message = `${stepNames[step]} completed successfully`;
        }

        res.json({
            success: true,
            message: message,
            executed_steps: stepsToExecute,
            results: results
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to process documents",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
            executed_steps: stepsToExecute || []
        });
    } finally {
        client.release();
    }
});

app.post('/update-solution', async (req, res) => {
  let client;
  try {
    const { id, loesung, korr } = req.body;
    
    if (!id) {
      return res.status(400).json({
        status: 'error',
        message: 'ID (PK_LEHR_LOESUNG) is required'
      });
    }
    
    if (!loesung) {
      return res.status(400).json({
        status: 'error',
        message: 'Loesung field is required'
      });
    }
    
    client = await pool.connect();
    await client.query('BEGIN');
    
    const result = await client.query(`
      UPDATE "COMPANY"."T_LEHR_LOESUNG" 
      SET "LOESUNG" = $1, "KORR" = $3
      WHERE "PK_LEHR_LOESUNG" = $2
      RETURNING "PK_LEHR_LOESUNG", "LOESUNG", "KORR"
    `, [loesung, id, korr]);
    
    if (result.rowCount === 0) {
      throw new Error(`Solution with ID ${id} not found`);
    }
    
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: 'Solution updated successfully',
      updatedSolution: result.rows[0]
    });
    
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Database error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update solution',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});


app.post('/update_projects', async (req, res) => {
  let client;
  try {
    // Validate request body
    const { von, bis, pk_proj_projekt } = req.body;
    
    if (!von || !bis || !pk_proj_projekt) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: von, bis, and pk_proj_projekt are required'
      });
    }

    client = await pool.connect();
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Execute the update with proper parameters
    const result = await client.query(`
      UPDATE "COMPANY"."T_PROJ_PROJEKT" 
      SET "VON" = $1, "BIS" = $2
      WHERE "PK_PROJ_PROJEKT" = $3
      RETURNING "PK_PROJ_PROJEKT"  -- Return the updated row's primary key
    `, [von, bis, pk_proj_projekt]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: `Updated ${result.rowCount} record(s)`,
      updatedKey: result.rows[0]?.PK_PROJ_PROJEKT
    });
    
  } catch (err) {
    // Rollback on error
    if (client) await client.query('ROLLBACK');
    console.error('Database error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update records',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

app.post('/update-lex-relation', async (req, res) => {
  let client;
  try {
    const {
      pk_rel_lex_kto_bel,
      fk_main_key,
      fk_inp_belege_all,
      ok,
      comm,
      fk_rel_lex_kto_bel,
      fk_inp_belege_pos_all,
      created_by,
      modified_by,
      ok_datum_filled,
      fk_mdt_mandant,
      fk_bas_bas_vorgang,
      fk_rel_lex_kto_bel_sub,
      flg_lexoffice_buchung,
      flg_lexoffice_mit_bild,
      link_lexoffice_buchung,
      lexoffice_referenz_nr
    } = req.body;

    client = await pool.connect();
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Execute the update with parameterized values
    const result = await client.query(`
      UPDATE "COMPANY"."T_REL_LEX_KTO_BEL" 
      SET 
        "MODIFIED_AT" = CURRENT_TIMESTAMP,
        "FK_MAIN_KEY" = $2,
        "FK_INP_BELEGE_ALL" = $3,
        "OK" = $4,
        "COMM" = $5,
        "FK_REL_LEX_KTO_BEL" = $6,
        "FK_INP_BELEGE_POS_ALL" = $7,
        "CREATED_BY" = $8,
        "MODIFIED_BY" = $9,
        "OK_DATUM_FILLED" = $10,
        "FK_MDT_MANDANT" = $11,
        "FK_BAS_BAS_VORGANG" = $12,
        "FK_REL_LEX_KTO_BEL_SUB" = $13,
        "FLG_LEXOFFICE_BUCHUNG" = $14,
        "FLG_LEXOFFICE_MIT_BILD" = $15,
        "LINK_LEXOFFICE_BUCHUNG" = $16,
        "LEXOFFICE_REFERENZ_NR" = $17
      WHERE "PK_REL_LEX_KTO_BEL" = $1
      RETURNING "PK_REL_LEX_KTO_BEL", "FK_MAIN_KEY"
    `, [
pk_rel_lex_kto_bel,
      fk_main_key,
      fk_inp_belege_all,
      ok,
      comm,
      fk_rel_lex_kto_bel,
      fk_inp_belege_pos_all,
      created_by,
      modified_by,
      ok_datum_filled,
      fk_mdt_mandant,
      fk_bas_bas_vorgang,
      fk_rel_lex_kto_bel_sub,
      flg_lexoffice_buchung,
      flg_lexoffice_mit_bild,
      link_lexoffice_buchung,
      lexoffice_referenz_nr
      
    ]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: `Updated ${result.rowCount} records`,
      updatedRecords: result.rows.map(row => ({
        pk_rel_lex_kto_bel: row.PK_REL_LEX_KTO_BEL,
        fk_main_key: row.FK_MAIN_KEY
      }))
    });
    
  } catch (err) {
    // Rollback on error
    if (client) await client.query('ROLLBACK');
    console.error('Database error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update records',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

app.post('/update-bild', async (req, res) => {
  let client;
  try {
    const {
      pk_bild_bilder,
      thumbnail,
      h_px,
      w_px,
     dummy_bild,
      fk_std_klassifikation1,
      fk_std_klassifikation2,
      fk_bild_old,
      klassifikation_1,
      klassifikation_2,
      mimetype,
      comm,
      quality,
      ordner1,
      ordner2,
      fk_abl_ordner_page,
      cnt_sub_bilder,
      cnt_sub_bilder_erfasst,
      modified_by,
      fk_mdt_mandant,
      filecontent_json,
      datum_zuord_ok,
      final_cnt_fk_inp_belege_all,
      final_cnt_fk_kon_person,
      final_cnt_fk_inv_inventare,
      klassifikation_3,
      final_klassifikation,
      fk_media_buch_buch,
      fk_std_bild_bildart
    } = req.body;

    client = await pool.connect();
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Execute the update with parameterized values
    const result = await client.query(`
      UPDATE "COMPANY"."T_BILD_BILDER" 
      SET 
        "MODIFIED_AT" = CURRENT_TIMESTAMP,
        "THUMBNAIL" = $2,
        "H_PX" = $3,
        "W_PX" = $4,
        "DUMMY_BILD" =$5,
        "FK_STD_KLASSIFIKATION1" = $6,
        "FK_STD_KLASSIFIKATION2" = $7,
        "FK_BILD_OLD" = $8,
        "KLASSIFIKATION_1" = $9,
        "KLASSIFIKATION_2" = $10,
        "MIMETYPE" = $11,
        "COMM" = $12,
        "QUALITY" = $13,
        "ORDNER1" = $14,
        "ORDNER2" = $15,
        "FK_ABL_ORDNER_PAGE" = $16,
        "CNT_SUB_BILDER" = $17,
        "CNT_SUB_BILDER_ERFASST" = $18,
        "MODIFIED_BY" = $19,
        "FK_MDT_MANDANT" = $20,
        "FILECONTENT_JSON" = $21,
        "DATUM_ZUORD_OK" = $22,
        "FINAL_CNT_FK_INP_BELEGE_ALL" = $23,
        "FINAL_CNT_FK_KON_PERSON" = $24,
        "FINAL_CNT_FK_INV_INVENTARE" = $25,
        "KLASSIFIKATION_3" = $26,
        "FINAL_KLASSIFIKATION" = $27,
        "FK_MEDIA_BUCH_BUCH" = $28,
        "FK_STD_BILD_BILDART" = $29
      WHERE "PK_BILD_BILDER" = $1
      RETURNING "PK_BILD_BILDER"
    `, [
      pk_bild_bilder,
      thumbnail,
      h_px,
      w_px,
      dummy_bild,
      fk_std_klassifikation1,
      fk_std_klassifikation2,
      fk_bild_old,
      klassifikation_1,
      klassifikation_2,
      mimetype,
      comm,
      quality,
      ordner1,
      ordner2,
      fk_abl_ordner_page,
      cnt_sub_bilder,
      cnt_sub_bilder_erfasst,
      modified_by,
      fk_mdt_mandant,
      filecontent_json,
      datum_zuord_ok,
      final_cnt_fk_inp_belege_all,
      final_cnt_fk_kon_person,
      final_cnt_fk_inv_inventare,
      klassifikation_3,
      final_klassifikation,
      fk_media_buch_buch,
      fk_std_bild_bildart
    ]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: `Updated ${result.rowCount} records`,
      updatedRecords: result.rows.map(row => ({
        pk_bild_bilder: row.PK_BILD_BILDER
      }))
    });
    
  } catch (err) {
    // Rollback on error
    if (client) await client.query('ROLLBACK');
    console.error('Database error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update records',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

app.post('/upd_adr_adresse_schnell', async (req, res) => {
  let client;
  try {
    const { fk_adr_adresse, fk_loc_location, pk_adr_adresse_schnell } = req.body;
    
    // Validate required parameters
    if (!pk_adr_adresse_schnell) {
      return res.status(400).json({
        status: 'error',
        message: 'PK_ADR_ADRESSE_SCHNELL is required'
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');
    
    // Build the update query
    const queryText = `
      UPDATE "COMPANY"."T_ADR_ADRESSE_SCHNELL" 
      SET "FK_ADR_ADRESSE" = $1, "FK_LOC_LOCATION" = $2
      WHERE "PK_ADR_ADRESSE_SCHNELL" = $3
      RETURNING *
    `;
    
    const queryParams = [
      fk_adr_adresse || null, 
      fk_loc_location || null, 
      pk_adr_adresse_schnell
    ];

    const result = await client.query(queryText, queryParams);
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: `Updated ${result.rowCount} record(s)`,
      data: result.rows[0]
    });
    
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Database error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update records',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

app.post('/update-beleg-ok', async (req, res) => {
  let client;
  try {
    // Destructure all possible parameters
    const {
      PK_INP_BELEGE_ALL,
      FINAL_CNT_ZUGEORD_TRANS,
      FINAL_CNT_ZUGEORD_BILDER,
      // All DATUM fields
      DATUM_ORT_OK,
      DATUM_ADDRESSE_OK,
      DATUM_BUSSGELD_OK,
      DATUM_BELEG_POS_OK,
      DATUM_BUCHUNG_OK,
      DATUM_VERPFL_BEL_OK,
      DATUM_DUPL_OK,
      DATUM_STATUS_VERW,
      DATUM_STATUS_KAT,
      DATUM_BASISDATEN_OK,
      DATUM_CITY_LAND_OK,
      DATUM_BELEGSTATUS_OK,
      DATUM_BELEGART_OK,
      DATUM_ZEITRAEUME_OK,
      DATUM_BETRAG_OK,
      DATUM_BETRAG_FRMDW_OK,
      DATUM_BETRAG_EUR_OK,
      DATUM_BELEGPOSITION_OK,
      DATUM_ZUORDNUNG_OK,
      DATUM_RUECKSEITE_OK,
      DATUM_KOMMENTARE_OK,
      DATUM_TANKEN_OK,
      DATUM_VERGEHEN_OK,
      DATUM_ZAHLUNGSSTATUS_OK,
      DATUM_SONSTIGES_OK,
      DATUM_STUNDENZETTEL_OK,
      DATUM_RECHNUNG_OK,
      DATUM_STEUER_OK,
      DATUM_LOHNSTEUER_OK,
      DATUM_DOCUMENT_LIST_OK,
      DATUM_ALLG_ZUORDNUNG_OK,
      DATUM_ANTRAGSTELLUNG,
      DATUM_EINGANGSDATUM,
      DATUM_ZUORD_VERTRAEGE_OK,
      DATUM_ZUORD_BELEGE_OK,
      DATUM_ZUORD_GESCHAEFTSPARTNER_OK,
      DATUM_ZUORD_TERMINE_OK,
      DATUM_ZUORD_TODO_OK,
      DATUM_ZUORD_POST_OK,
      DATUM_RELATION_OK,
      DATUM_ALL_OK,
      DATUM_ZUGEORD_BILDER_OK,
      DATUM_ZUGEORD_TRANS_OK,
      ...rest // Catch any unexpected fields
    } = req.body;

    if (!PK_INP_BELEGE_ALL) {
      return res.status(400).json({
        status: 'error',
        message: 'PK_INP_BELEGE_ALL is required'
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Build the dynamic SET clause
    const setClauses = [];
    const values = [PK_INP_BELEGE_ALL];
    let paramIndex = 2;

    // Helper function to process date fields
    const processDateField = (fieldName, fieldValue) => {
      if (fieldValue === 1) {
        setClauses.push(`"${fieldName}" = NOW()`);
      } else if (fieldValue === 0) {
        setClauses.push(`"${fieldName}" = NULL`);
      }
      // Undefined/not provided = no update
    };

    // Process all date fields
    processDateField('DATUM_ORT_OK', DATUM_ORT_OK);
    processDateField('DATUM_ADDRESSE_OK', DATUM_ADDRESSE_OK);
    processDateField('DATUM_BUSSGELD_OK', DATUM_BUSSGELD_OK);
    processDateField('DATUM_BELEG_POS_OK', DATUM_BELEG_POS_OK);
    processDateField('DATUM_BUCHUNG_OK', DATUM_BUCHUNG_OK);
    processDateField('DATUM_VERPFL_BEL_OK', DATUM_VERPFL_BEL_OK);
    processDateField('DATUM_DUPL_OK', DATUM_DUPL_OK);
    processDateField('DATUM_STATUS_VERW', DATUM_STATUS_VERW);
    processDateField('DATUM_STATUS_KAT', DATUM_STATUS_KAT);
    processDateField('DATUM_BASISDATEN_OK', DATUM_BASISDATEN_OK);
    processDateField('DATUM_CITY_LAND_OK', DATUM_CITY_LAND_OK);
    processDateField('DATUM_BELEGSTATUS_OK', DATUM_BELEGSTATUS_OK);
    processDateField('DATUM_BELEGART_OK', DATUM_BELEGART_OK);
    processDateField('DATUM_ZEITRAEUME_OK', DATUM_ZEITRAEUME_OK);
    processDateField('DATUM_BETRAG_OK', DATUM_BETRAG_OK);
    processDateField('DATUM_BETRAG_FRMDW_OK', DATUM_BETRAG_FRMDW_OK);
    processDateField('DATUM_BETRAG_EUR_OK', DATUM_BETRAG_EUR_OK);
    processDateField('DATUM_BELEGPOSITION_OK', DATUM_BELEGPOSITION_OK);
    processDateField('DATUM_ZUORDNUNG_OK', DATUM_ZUORDNUNG_OK);
    processDateField('DATUM_RUECKSEITE_OK', DATUM_RUECKSEITE_OK);
    processDateField('DATUM_KOMMENTARE_OK', DATUM_KOMMENTARE_OK);
    processDateField('DATUM_TANKEN_OK', DATUM_TANKEN_OK);
    processDateField('DATUM_VERGEHEN_OK', DATUM_VERGEHEN_OK);
    processDateField('DATUM_ZAHLUNGSSTATUS_OK', DATUM_ZAHLUNGSSTATUS_OK);
    processDateField('DATUM_SONSTIGES_OK', DATUM_SONSTIGES_OK);
    processDateField('DATUM_STUNDENZETTEL_OK', DATUM_STUNDENZETTEL_OK);
    processDateField('DATUM_RECHNUNG_OK', DATUM_RECHNUNG_OK);
    processDateField('DATUM_STEUER_OK', DATUM_STEUER_OK);
    processDateField('DATUM_LOHNSTEUER_OK', DATUM_LOHNSTEUER_OK);
    processDateField('DATUM_DOCUMENT_LIST_OK', DATUM_DOCUMENT_LIST_OK);
    processDateField('DATUM_ALLG_ZUORDNUNG_OK', DATUM_ALLG_ZUORDNUNG_OK);
    processDateField('DATUM_ANTRAGSTELLUNG', DATUM_ANTRAGSTELLUNG);
    processDateField('DATUM_EINGANGSDATUM', DATUM_EINGANGSDATUM);
    processDateField('DATUM_ZUORD_VERTRAEGE_OK', DATUM_ZUORD_VERTRAEGE_OK);
    processDateField('DATUM_ZUORD_BELEGE_OK', DATUM_ZUORD_BELEGE_OK);
    processDateField('DATUM_ZUORD_GESCHAEFTSPARTNER_OK', DATUM_ZUORD_GESCHAEFTSPARTNER_OK);
    processDateField('DATUM_ZUORD_TERMINE_OK', DATUM_ZUORD_TERMINE_OK);
    processDateField('DATUM_ZUORD_TODO_OK', DATUM_ZUORD_TODO_OK);
    processDateField('DATUM_ZUORD_POST_OK', DATUM_ZUORD_POST_OK);
    processDateField('DATUM_RELATION_OK', DATUM_RELATION_OK);
    processDateField('DATUM_ALL_OK', DATUM_ALL_OK);
    processDateField('DATUM_ZUGEORD_BILDER_OK', DATUM_ZUGEORD_BILDER_OK);
    processDateField('DATUM_ZUGEORD_TRANS_OK', DATUM_ZUGEORD_TRANS_OK);

    // Process count fields
    if (FINAL_CNT_ZUGEORD_TRANS !== undefined) {
      setClauses.push(`"FINAL_CNT_ZUGEORD_TRANS" = $${paramIndex}`);
      values.push(FINAL_CNT_ZUGEORD_TRANS);
      paramIndex++;
    }

    if (FINAL_CNT_ZUGEORD_BILDER !== undefined) {
      setClauses.push(`"FINAL_CNT_ZUGEORD_BILDER" = $${paramIndex}`);
      values.push(FINAL_CNT_ZUGEORD_BILDER);
      paramIndex++;
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No fields to update'
      });
    }

    const query = `
      UPDATE "COMPANY"."T_INP_BELEGE_ALL" 
      SET ${setClauses.join(', ')}
      WHERE "PK_INP_BELEGE_ALL" = $1
      RETURNING "PK_INP_BELEGE_ALL", "FK_MAIN_KEY"
    `;

    const result = await client.query(query, values);
    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: `Updated ${result.rowCount} records`,
      updatedId: PK_INP_BELEGE_ALL,
      updatedFields: setClauses,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('Database error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update records',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

app.post('/add_belege_bild', async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  try {
    const { FK_INP_BELEGE_ALL, FK_BILD_BILDER, MAIN_BILD } = req.body;

    // Validate required fields
    if (!FK_INP_BELEGE_ALL || !FK_BILD_BILDER) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Execute query with parameterized values
    const result = await client.query(`
      INSERT INTO "COMPANY"."T_REL_INP_INP_BELEGE_ALL_BILD_BILDER"
      ("FK_INP_BELEGE_ALL", "FK_BILD_BILDER", "MAIN_BILD") 
      VALUES ($1, $2, $3)
      RETURNING *`, // RETURNING * returns the inserted record
      [FK_INP_BELEGE_ALL, FK_BILD_BILDER, MAIN_BILD]
    );

    res.json({
      success: true,
      message: 'Record added successfully',
      data: result.rows[0] // Contains the inserted record
    });

  } catch (error) {
    console.error('Error adding belege-bild relation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

// Enhanced version of /add-loesung-series that automatically creates relations
app.post('/add-loesung-series', async (req, res) => {
  const client = await pool.connect();
  try {
    const { fk_lehr_frage, von, bis } = req.body;

    // Validate required fields
    if (!fk_lehr_frage || von === undefined || bis === undefined) {
      return res.status(400).json({
        success: false,
        error: 'fk_lehr_frage, von, and bis are required'
      });
    }

    if (von > bis) {
      return res.status(400).json({
        success: false,
        error: 'von must be less than or equal to bis'
      });
    }

    await client.query('BEGIN');

    const loesungIds = [];
    const insertedRecords = [];

    // Create solutions for each number in the range
    for (let i = von; i <= bis; i++) {
      // Insert solution
      const insertLoesungQuery = `
        INSERT INTO "COMPANY"."T_LEHR_LOESUNG" ("LOES_NR")
        VALUES ($1)
        RETURNING "PK_LEHR_LOESUNG", "LOES_NR"
      `;
      const loesungResult = await client.query(insertLoesungQuery, [
        i
      ]);

      const newLoesung = loesungResult.rows[0];
      loesungIds.push(newLoesung.PK_LEHR_LOESUNG);
      insertedRecords.push(newLoesung);

      // Create relation between question and solution
      const insertRelationQuery = `
        INSERT INTO "COMPANY"."T_REL_LEHR_FRAGE_LOESUNG" ("FK_LEHR_FRAGE", "FK_LEHR_LOESUNG")
        VALUES ($1, $2)
      `;
      await client.query(insertRelationQuery, [fk_lehr_frage, newLoesung.PK_LEHR_LOESUNG]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Successfully created ${loesungIds.length} solutions and relations`,
      loesungIds: loesungIds,
      data: insertedRecords
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating solution series:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  } finally {
    client.release();
  }
});

app.post('/add-frage-loesung-relation', async (req, res) => {
  const client = await pool.connect();
  try {
    const { PK_LEHR_FRAGE, PK_LEHR_LOESUNG } = req.body;

    // Validate required fields
    if (!PK_LEHR_FRAGE || !PK_LEHR_LOESUNG) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: PK_LEHR_FRAGE and PK_LEHR_LOESUNG are required'
      });
    }

    // Validate that parameters are numbers
    if (isNaN(PK_LEHR_FRAGE) || isNaN(PK_LEHR_LOESUNG)) {
      return res.status(400).json({
        success: false,
        error: 'PK_LEHR_FRAGE and PK_LEHR_LOESUNG must be valid numbers'
      });
    }

    // Execute query with parameterized values
    const result = await client.query(`
      INSERT INTO "COMPANY"."T_REL_LEHR_FRAGE_LOESUNG" ("FK_LEHR_FRAGE", "FK_LEHR_LOESUNG")
      SELECT $1, "PK_LEHR_LOESUNG"
      FROM "COMPANY"."T_LEHR_LOESUNG" 
      WHERE "PK_LEHR_LOESUNG" = $2
      RETURNING "PK_REL_LEHR_FRAGE_LOESUNG", "FK_LEHR_FRAGE", "FK_LEHR_LOESUNG"
    `, [PK_LEHR_FRAGE, PK_LEHR_LOESUNG]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'No solution found with the provided PK_LEHR_LOESUNG'
      });
    }

    res.json({
      success: true,
      message: 'Question-solution relation added successfully',
      data: result.rows[0] // Contains the inserted relation
    });

  } catch (error) {
    console.error('Error adding frage-loesung relation:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') { // PostgreSQL unique violation code
      return res.status(400).json({
        success: false,
        error: 'This question-solution relation already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

app.post('/add_strasse', async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  try {
    const { FK_ADR_ORT, STRASSE } = req.body;

   

    // Execute query with parameterized values
    const result = await client.query(`
      INSERT INTO "COMPANY"."T_ADR_STRASSE"
      ("FK_ADR_ORT", "Straße") 
      VALUES ($1, $2)
      RETURNING *`, // RETURNING * returns the inserted record
      [ FK_ADR_ORT, STRASSE]
    );

    res.json({
      success: true,
      message: 'Record added successfully',
      data: result.rows[0] // Contains the inserted record
    });

  } catch (error) {
    console.error('Error adding belege-bild relation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

app.post('/add_rel_plz_ort_strasse', async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  try {
    const { FK_ADR_PLZ_ORT, FK_ADR_STRASSE } = req.body;

   

    // Execute query with parameterized values
    const result = await client.query(`
      INSERT INTO "COMPANY"."T_REL_ADR_PLZ_STRASSE"
      ("FK_ADR_PLZ_ORT", "FK_ADR_STRASSE") 
      VALUES ($1, $2)
      RETURNING *`, // RETURNING * returns the inserted record
      [ FK_ADR_PLZ_ORT, FK_ADR_STRASSE]
    );

    res.json({
      success: true,
      message: 'Record added successfully',
      data: result.rows[0] // Contains the inserted record
    });

  } catch (error) {
    console.error('Error adding belege-bild relation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

app.post('/add_strasse_hsnr', async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  try {
    const { FK_REL_ADR_PLZ_ORT_STRASSE, HSNR } = req.body;

   

    // Execute query with parameterized values
    const result = await client.query(`
      INSERT INTO "COMPANY"."T_ADR_STRASSE_HSNR"
      ("FK_REL_ADR_PLZ_STRASSE", "HSNR") 
      VALUES ($1, $2)
      RETURNING *`, // RETURNING * returns the inserted record
      [ FK_REL_ADR_PLZ_ORT_STRASSE, HSNR]
    );

    res.json({
      success: true,
      message: 'Record added successfully',
      data: result.rows[0] // Contains the inserted record
    });

  } catch (error) {
    console.error('Error adding belege-bild relation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

app.post('/add_kasse_from_inp', async (req, res) => {
  const client = await pool.connect();
  try {
    const { FK_INP_BELEGE_ALL } = req.body;

    // Validate input
    if (!FK_INP_BELEGE_ALL) {
      return res.status(400).json({
        success: false,
        error: 'FK_INP_BELEGE_ALL is required'
      });
    }

    await client.query('BEGIN'); // Start transaction

    const result = await client.query(`
      INSERT INTO "COMPANY"."T_KTO_KAS_KASSE" (
        "DATUM", "BUCHUNGSTEXT", "BETRAG", "GESAMT_BETRAG",
        "JAHR", "COMM", "FK_BAS_STEU_STEUER_SATZ_FRMDW",
        "FRMDW_NETTO_BETRAG", "FRMDW_MWST_BETRAG", "FRMDW_BRUTTO_BETRAG",
        "FRMDW_BRUTTO_INCL_TRINKG", "FK_BAS_MON_FRMDW",
        "FK_BAS_MON_FRMDW_MWST_SATZ", "CREATED_AT",
        "FK_KTO_BANKKONTO", "FK_STD_KTO_KONTOTYP", "FK_MAIN_KEY"
      )
      SELECT 
        "BELEGDATUM",
        "PK_INP_BELEGE_ALL" || ' - ' || SUBSTR("BEZEICHNUNG", 1, 200),
        -1 * "BRUTTO_BETRAG",
        -1 * "BRUTTO_BETRAG",
        SUBSTR("BELEGDATUM"::text, 1, 4)::double precision,
        null,
        "FK_FRMDW_BAS_STEU_STEUER_SATZ",
        "FRMDW_NETTO_BETRAG",
        "FRMDW_MWST_BETRAG",
        "FRMDW_BRUTTO_BETRAG",
        "FRMDW_BRUTTO_INCL_TRINKG",
        "FK_FRMDW_BAS_MON_WAEHRUNG",
        "FK_FRMDW_BAS_MON_MWST_SATZ",
        now(),
        61,
        6,
        nextval('"COMPANY"."KTO_KONTO_SEQ"')
      FROM "COMPANY"."T_INP_BELEGE_ALL" 
      WHERE "PK_INP_BELEGE_ALL" = $1
      RETURNING "FK_MAIN_KEY"`,
      [FK_INP_BELEGE_ALL]
    );

    await client.query('COMMIT'); // Commit transaction

    res.json({
      success: true,
      message: 'Record added successfully',
      data: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback on error
    console.error('Error adding kasse record:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release();
  }
});

app.post('/add_addresse', async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  try {
    const { STRASSE, HSNR,BEZEICHNUNG, FK_ADR_PLZ_ORT,FK_ADR_STRASSE_HSNR, KOORDINATEN, COMM, FK_ADR_REGION } = req.body;

   

    // Execute query with parameterized values
    const result = await client.query(`
      
insert into "COMPANY"."T_ADR_ADRESSE" (

"STRASSE",
"HSNR",
"BESCHREIBUNG",
"FK_ADR_PLZ_ORT",
"POSTFACH",
"CREATED_BY",
"CREATED_AT",
"MODIFIED_BY",
"MODIFIED_AT",
"COMM",
"GEBAEUDE_NR",
"VALID",
"VALID_FROM",
"VALID_TO",
"FK_MDT_MANDANT",
"FK_ADR_STRASSE_HSNR",
"KOORDINATEN",
"FK_ADR_REGION"
)
select $1, --"STRASSE",
$2, --"HSNR",
$3, --"BESCHREIBUNG",
$4,-- "FK_ADR_PLZ_ORT",
null, -- "POSTFACH",
null, --"CREATED_BY",
now(), --"CREATED_AT",
null, --"MODIFIED_BY",
null, --"MODIFIED_AT",
$7, --"COMM",
null, --"GEBAEUDE_NR",
null, --"VALID",
null, --"VALID_FROM",
null, --"VALID_TO",
1, --"FK_MDT_MANDANT",
$5, --"FK_ADR_STRASSE_HSNR"
$6, --Koordinaten
$8 --FK_ADR_REGION
      RETURNING *`, // RETURNING * returns the inserted record
      [ STRASSE, HSNR,BEZEICHNUNG, FK_ADR_PLZ_ORT,FK_ADR_STRASSE_HSNR, KOORDINATEN, COMM, FK_ADR_REGION]
    );

    res.json({
      success: true,
      message: 'Record added successfully',
      data: result.rows[0] // Contains the inserted record
    });

  } catch (error) {
    console.error('Error adding belege-bild relation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

app.post('/add_location', async (req, res) => {
  const client = await pool.connect(); // Get a client from the pool
  try {
    const { LOCATION_NAME,LOCATION_TYPE , LOCATION_TYPE_1, FK_ADR_ADRESSE, KOORDINATEN, COMM } = req.body;

   

    // Execute query with parameterized values
    const result = await client.query(`
      
INSERT INTO "COMPANY"."T_LOC_LOCATION" (
  "LOCATION",
  "FK_BAS_LOC_LOCATION_TYPE",
  "FK_BAS_LOC_LOCATION_TYPE_1",
  "FK_ADR_ADRESSE",
  "CREATED_BY",
  "CREATED_AT",
  "MODIFIED_BY",
  "MODIFIED_AT",
  "FK_MDT_MANDANT",
  "COMM",
  "DESCR",
  "KOORDINATEN"
)
SELECT 
  $1, -- "LOCATION",
  $2, -- "FK_BAS_LOC_LOCATION_TYPE",
  COALESCE(NULLIF($3, ''), '362')::bigint, -- "FK_BAS_LOC_LOCATION_TYPE_1" (use 362 if empty)
  $4, -- "FK_ADR_ADRESSE",
  NULL, -- "CREATED_BY",
  NOW(), -- "CREATED_AT",
  NULL, -- "MODIFIED_BY",
  NULL, -- "MODIFIED_AT",
  1, -- "FK_MDT_MANDANT",
  $5, -- "COMM",
  NULL, -- "DESCR",
  $6 -- "KOORDINATEN"
RETURNING *`, // RETURNING * returns the inserted record
      [ LOCATION_NAME,LOCATION_TYPE ,LOCATION_TYPE_1, FK_ADR_ADRESSE, KOORDINATEN, COMM]
    );

    res.json({
      success: true,
      message: 'Record added successfully',
      data: result.rows[0] // Contains the inserted record
    });

  } catch (error) {
    console.error('Error adding belege-bild relation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    client.release(); // Release the client back to the pool
  }
});



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.post('/update-image-document', async (req, res) => {
  const { documentId, relationshipId } = req.body;
  let client;

  // Validate input
  if (!documentId || !relationshipId) {
    return res.status(400).json({
      status: 'error',
      message: 'Both documentId and relationshipId are required'
    });
  }

  try {
    client = await pool.connect();
    
    // Begin transaction
    await client.query('BEGIN');
    
    // 1. First verify the relationship exists
    const checkQuery = `
      SELECT "PK_REL_INP_INP_BELEGE_ALL_BILD_BILDER" 
      FROM "COMPANY"."T_REL_INP_INP_BELEGE_ALL_BILD_BILDER" 
      WHERE "PK_REL_INP_INP_BELEGE_ALL_BILD_BILDER" = $1
    `;
    const checkResult = await client.query(checkQuery, [relationshipId]);
    
    if (checkResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'Relationship record not found'
      });
    }
    
    // 2. Verify the document exists
    const docCheckQuery = `
      SELECT "PK_INP_BELEGE_ALL" 
      FROM "COMPANY"."T_INP_BELEGE_ALL" 
      WHERE "PK_INP_BELEGE_ALL" = $1
    `;
    const docCheckResult = await client.query(docCheckQuery, [documentId]);
    
    if (docCheckResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'Document record not found'
      });
    }
    
    // 3. Perform the update
    const updateQuery = `
      UPDATE "COMPANY"."T_REL_INP_INP_BELEGE_ALL_BILD_BILDER" 
      SET "FK_INP_BELEGE_ALL" = $1 
      WHERE "PK_REL_INP_INP_BELEGE_ALL_BILD_BILDER" = $2
      RETURNING *
    `;
    const updateResult = await client.query(updateQuery, [documentId, relationshipId]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: 'Image-document relationship updated successfully',
      updatedRecord: updateResult.rows[0]
    });
    
  } catch (err) {
    // Rollback on error
    if (client) await client.query('ROLLBACK');
    console.error('Database error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update image-document relationship',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } finally {
    if (client) client.release();
  }
});

app.put('/update-belege-all/:id', async (req, res) => {
  const documentId = req.params.id;
  const updateFields = req.body;
  let client;

  // Validate input
  if (!documentId) {
    return res.status(400).json({
      status: 'error',
      message: 'Document ID is required'
    });
  }

  if (!updateFields || Object.keys(updateFields).length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'No fields to update provided'
    });
  }

  try {
    client = await pool.connect();
    
    // Begin transaction
    await client.query('BEGIN');
    
    // 1. First verify the document exists
    const checkQuery = `
      SELECT "PK_INP_BELEGE_ALL" 
      FROM "COMPANY"."T_INP_BELEGE_ALL" 
      WHERE "PK_INP_BELEGE_ALL" = $1
    `;
    const checkResult = await client.query(checkQuery, [documentId]);
    
    if (checkResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        status: 'error',
        message: 'Document record not found'
      });
    }

    // 2. Build dynamic update query
    const allowedColumns = [
      'FK_LEX_BUCHUNG', 'FK_BAS_KAT_KATEGORIE', 'FK_BAS_KAL_ARBEITSTAG', 'FK_KTO_BUCHUNG',
      'FK_STD_KTO_ZAHLUNGSART', 'FK_STD_VERW_VERWENDUNGSZWECK', 'FK_INV_INVENTAR',
      'FK_PROJ_PROJEKT', 'BELEGNUMMER', 'BEZEICHNUNG', 'FK_ADR_LAND', 'FK_ADR_CITY',
      'BELEGDATUM', 'VON', 'BIS', 'NETTO_BETRAG', 'FK_BAS_STEU_STEUER_SATZ',
      'MWST_BETRAG', 'BRUTTO_BETRAG', 'FK_BAS_MON_WAEHRUNG', 'STEUERNUMMER',
      'FK_BAS_MON_UMRECHNUNGSKURS', 'COMM_REST_BELEG', 'COMM_TEL_BELEG', 'COMM_PRODUKTE',
      'COMM_BEGRUENDUNG', 'COMM_SONSTIGES', 'BELEG', 'ZAHLUNGSBELEG', 'LITER',
      'ZAPFSAEULE', 'FK_LOC_LOCATION', 'PERSOENLICH_VOR_ORT', 'BELEG_UHRZEIT',
      'VON_UHRZEIT', 'BIS_UHRZEIT', 'FK_BAS_KAL_VON_ARBEITSTAG', 'FK_BAS_KAL_BIS_ARBEITSTAG',
      'COMM_ADRESSE', 'TANKSTELLEN_NR', 'BRUTTO_BETRAG_INCL_TRINKG', 'COMM_PARKTICKET',
      'FRMDW_NETTO_BETRAG', 'FK_FRMDW_BAS_MON_WAEHRUNG', 'FK_FRMDW_BAS_MON_MWST_SATZ',
      'FRMDW_MWST_BETRAG', 'FRMDW_BRUTTO_BETRAG', 'FRMDW_BRUTTO_INCL_TRINKG',
      'EUR_MWST_BETRAG', 'EUR_BRUTTO_BETRAG', 'EUR_BRUTTO_INCL_TRINKG', 'EUR_NETTO_BETRAG',
      'PREIS_PRO_MENGE', 'MENGENEINHEIT', 'LA_DATUM', 'FK_LA_KONTO', 'FK_LA_WDH',
      'FK_STD_INP_ZAHLUNGSSTATUS', 'VERG_COMM_VERGEHEN', 'VERG_BEHOERDE', 'VERG_CNT_PUNKTE',
      'FK_BEL_BELEG_ABLAGE', 'FK_ABL_ORDNER_PAGE', 'VERG_CNT_PUNKTE_GESCHAETZT',
      'VERG_PUNKTE_VON', 'VERG_PUNKTE_BIS', 'FK_VERG_LOC_LOCATION', 'FK_IMP_BA_BEL_OLD',
      'VERG_GESCHW_IST', 'VERG_GESCHW_SOLL', 'VERG_GESCHW_UEBER_GRZ',
      'VERG_GESCHW_UEBER_GRZ_ABZGL_MESSTOL', 'VERG_CODE_BUSSGELD', 'VERG_DESCR_BUSSGELD',
      'ZAHLUNGSEINGANG', 'WEBSEITE', 'KUNDENNUMMER', 'FK_REAL_BELEG_EXIST', 'FK_CALC_STATE',
      'FK_EUR_CALC_STATE', 'FK_FRMDW_CALC_STATE', 'FK_STD_INP_STATUS', 'VERG_DATUM_VERGEHEN',
      'CREATED_AT', 'CREATED_BY', 'MODIFIED_AT', 'MODIFIED_BY', 'DATUM_ORT_OK',
      'DATUM_ADDRESSE_OK', 'DATUM_BUSSGELD_OK', 'DATUM_BELEG_POS_OK', 'DATUM_BUCHUNG_OK',
      'DATUM_VERPFL_BEL_OK', 'FK_INT_INTERNET_APP', 'FK_CONTR_DUPL_STATUS', 'DATUM_DUPL_OK',
      'DUPL_BEMERKUNG', 'FK_KON_GESCHAEFTSPARTNER', 'DUMMY', 'STORNIERT', 'FK_ADR_ADRESSE_SCHNELL',
      'FK_LEX_RELATION_SRC', 'FK_MAIN_KEY_SRC', 'FK_STD_CONTR_STATUS_KAT',
      'FK_STD_CONTR_STATUS_VERW', 'DATUM_STATUS_VERW', 'DATUM_STATUS_KAT',
      'VERG_DATUM_RECHTSKRAFT', 'VERG_DATUM_TILGUNG', 'VERG_NUMMER_FLENS', 'VERG_AKTENZEICHEN',
      'VERG_TATBESTANDSNUMMER', 'FK_VER_VERTRAG', 'MONAT', 'JAHR', 'GEZEICHNET_AM',
      'FK_KON_GEZEICHNET_VON', 'AZ_STUNDENZAHL', 'GENEHMIGT_AM', 'EINGEREICHT_AM_PP_1',
      'EINGEREICHT_AM_PP_2', 'BESTAETIGUNG_AM_PP_1', 'BESTAETIGUNG_AM_PP_2', 'FK_KON_PERSON',
      'AZ_UEBERSTUNDEN', 'AZ_SOLLSTUNDEN', 'AZ_FAHRZEIT', 'FK_STD_REISE_FAHRZEIT_EINHEIT',
      'FK_WORK_STUNDENSATZ', 'FK_WORK_STUNDENSATZ_UEBERSTUNDEN', 'FK_WORK_STUNDENSATZ_WOCHENENDE',
      'FK_MDT_MANDANT', 'ERSTELLT_AM', 'FK_WF_WORKFLOW_STEP', 'FK_WF_WORKFLOW',
      'FK_WORK_STUNDENSATZ_FAHRZEIT', 'SOLL_NETTO_BETRAG', 'SOLL_MWST_BETRAG', 'SOLL_BRUTTO_BETRAG',
      'FK_BAS_STEU_STEUER_SATZ_SOLL', 'FK_BAS_MON_WAEHRUNG_SOLL', 'FK_BAS_MON_UMRECHNUNGSKURS_SOLL',
      'MENGE', 'FK_STD_INP_MENGE_EINHEIT', 'ANZAHL_ZUGEHOERIGE_REAL_BELEGE_SOLL',
      'ANZAHL_ZUGEHOERIGE_REAL_BELEGE_IST', 'FK_KON_PERSON_GEZAHLT_VON', 'FK_STD_INP_BELEGART',
      'FK_ADR_RECHNUNGSADRESSE', 'FK_ADR_LIEFERADRESSE', 'RECHNUNGSDATUM', 'LIEFERDATUM',
      'BESTELLDATUM', 'ANLAGEN', 'FK_STEU_STEUER_JAHR', 'FK_STEU_STEUER_MONAT',
      'FK_STD_STEU_STEUERERKLAERUNG_ANLAGE', 'ETIN', 'IDENTIFIKATIONSNUMMER',
      'FK_KON_PERSON_GROUP_BEARBEITER_GRUPPE', 'FK_KON_PERSON_BEARBEITER',
      'FK_FRMDW_BAS_STEU_STEUER_SATZ', 'FLG_INVENTAR_RELEVANT', 'FK_STD_INP_PLANNED',
      'TRANSFER_DATE', 'FLG_TRANSFERED', 'FK_INP_BELEGE_ALL', 'FK_STD_INP_FIX_VARIABEL',
      'FK_INP_BELEGE_ALL_TEMPLATE', 'FK_STD_INP_EIN_AUS', 'FLG_VORAUSZAHLUNG',
      'FLG_ABSCHLAGSZAHLUNG', 'FLG_NACHZAHLUNG', 'FK_STD_INP_BELEG_FINISHED',
      'INP_BELEG_FINISHED_DATE', 'FK_STD_INP_STEUER_ERKLAERUNG_ART',
      'FK_STD_INP_TYPE_STEUERVORANMELDG', 'FK_KON_RECHNUNGSEMPFAENGER', 'FK_KON_RECHNUNGSSENDER',
      'SKONTO_BETRAG', 'FK_STD_INP_SKONTO_SATZ', 'FLG_VORSTEUER_BEZAHLT',
      'FLG_ZAHLUNG_ABGESCHLOSSEN', 'ZAHLUNG_BETRAG', 'ZAHLUNG_EINGANG_DATUM', 'MAHNKOSTEN',
      'EUR_MAHNKOSTEN', 'FRMDW_MAHNKOSTEN', 'SAEUMNISZUSCHLAG', 'EUR_SAEUMNISZUSCHLAG',
      'FRMDW_SAEUMNISZUSCHLAG', 'FK_STD_RE_OFFEN', 'FK_STD_STEU_VORSTEUERRELEVANT',
      'FK_STD_STEU_VORSTEUERPFLEGE', 'FK_STD_RE_RECHNUNGSERSTELLUNG',
      'FK_STD_RE_RECHNUNG_ERSTELLT', 'FK_STD_KTO_BANKBELEG', 'BELEG_MIMETYPE',
      'ZAHLUNGSBELEG_MIMETYPE', 'FK_KON_ORG_UNIT', 'FK_KON_KONTAKT',
      'FK_REL_KON_GESCHAEFTSPARTNER_KONTAKT', 'BELEG_FILENAME', 'COMM_ANLAGEN',
      'ZAHLUNG_ABGESCHLOSSEN_AM', 'ZAHLUNGSBETRAG', 'SKONTOBETRAG', 'SKONTOSATZ',
      'FK_STD_WH_LIEFERART', 'FK_WH_WAREN_BESTELLNR', 'FK_STD_WH_BESTELLTYP',
      'FK_BAS_BAS_VORGANG_TEMP', 'BARGELD_GEGEBEN', 'EUR_BARGELD_GEGEBEN',
      'FRMDW_BARGELD_GEGEBEN', 'RUECKGELD', 'EUR_RUECKGELD', 'FRMDW_RUECKGELD',
      'COMM_INFO_RUECKSEITE', 'FK_FRMDW_BAS_MON_UMRECHNUNGSKURS', 'FK_KTO_BANK_KARTE',
      'FK_STD_GEBUCHT', 'FK_STD_ERFASST', 'FK_STD_EIGENE_FREMD', 'FK_STD_BILD_VORHANDEN',
      'FK_STD_ZUGEORDNET', 'FK_STD_SONSTIGE', 'FK_STD_ZUORDNUNG', 'DATUM_BASISDATEN_OK',
      'DATUM_CITY_LAND_OK', 'DATUM_BELEGSTATUS_OK', 'DATUM_BELEGART_OK', 'DATUM_ZEITRAEUME_OK',
      'DATUM_BETRAG_OK', 'DATUM_BETRAG_FRMDW_OK', 'DATUM_BETRAG_EUR_OK', 'DATUM_BELEGPOSITION_OK',
      'DATUM_ZUORDNUNG_OK', 'DATUM_RUECKSEITE_OK', 'DATUM_KOMMENTARE_OK', 'DATUM_TANKEN_OK',
      'DATUM_VERGEHEN_OK', 'DATUM_ZAHLUNGSSTATUS_OK', 'DATUM_SONSTIGES_OK', 'DATUM_STUNDENZETTEL_OK',
      'DATUM_RECHNUNG_OK', 'DATUM_STEUER_OK', 'DATUM_LOHNSTEUER_OK', 'DATUM_DOCUMENT_LIST_OK',
      'DATUM_ALLG_ZUORDNUNG_OK', 'FK_MEDIA_BUCH_BUCH', 'TEXT_BUCHUNGSDATUM',
      'TEXT_BUCHUNGSDATUM_DATE', 'TEXT_BUCHUNGSDATUM_TIME', 'TEXT_BUCHUNGSDATUM_CHAR',
      'DATUM_ANTRAGSTELLUNG', 'DATUM_EINGANGSDATUM', 'BETRACHTUNGSZEITRAUM_START_JAHR',
      'BETRACHTUNGSZEITRAUM_START_MONAT', 'BETRACHTUNGSZEITRAUM_ANZAHL_MONATE',
      'DATUM_ZUORD_VERTRAEGE_OK', 'DATUM_ZUORD_BELEGE_OK', 'DATUM_ZUORD_GESCHAEFTSPARTNER_OK',
      'DATUM_ZUORD_TERMINE_OK', 'DATUM_ZUORD_TODO_OK', 'DATUM_ZUORD_POST_OK', 'DATUM_RELATION_OK',
      'ZAHLUNG_FAELLIG_AM', 'TITEL', 'RABATT_PUNKTE', 'FK_EXCEL_LISTE_MAJA', 'DOC_FILECONTENT',
      'BELEGNUMMER1', 'FK_ERF_BELEGE', 'FK_MEDIA_BUCH_SEITE', 'RENTE_ANW_HEUTE',
      'RENTE_KONTO_ENTGELTPUNKTE', 'RENTE_KONTO_BEITRAG_OEFFENTL_KASSEN',
      'RENTE_KONTO_BEITRAG_ARBEITNEHMER', 'RENTE_KONTO_BEITRAG_ARBEITGEBER', 'RENTE_MON_PROGNOSE',
      'DATUM_ALL_OK', 'FINAL_CNT_ZUGEORD_TRANS', 'FINAL_CNT_ZUGEORD_BILDER',
      'DATUM_ZUGEORD_BILDER_OK', 'DATUM_ZUGEORD_TRANS_OK', 'FINAL_CNT_ZUGEORD_BELEGE',
      'FINAL_CNT_ZUGEORD_BELEGE_POS', 'ZOLL_LEVEL_OF_INTEREST', 'ZOLL_VERSION',
      'FINAL_CNT_ZUGEORD_TABELLEN', 'FLG_ORIG_APP_OVERVIEW', 'FLG_ORIG_BELEG', 'FLG_ORIG_BUCHUNG'
    ];

    // Filter and validate update fields
    const validUpdateFields = {};
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updateFields).forEach(field => {
      const columnName = field.toUpperCase();
      if (allowedColumns.includes(columnName)) {
        validUpdateFields[columnName] = updateFields[field];
        setClauses.push(`"${columnName}" = $${paramCount}`);
        values.push(updateFields[field]);
        paramCount++;
      }
    });

    // Add MODIFIED_AT timestamp
    setClauses.push(`"MODIFIED_AT" = $${paramCount}`);
    values.push(new Date());
    paramCount++;

    if (setClauses.length === 1) { // Only MODIFIED_AT was added
      await client.query('ROLLBACK');
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update provided'
      });
    }

    // Add the ID parameter
    values.push(documentId);

    // 3. Perform the update
    const updateQuery = `
      UPDATE "COMPANY"."T_INP_BELEGE_ALL" 
      SET ${setClauses.join(', ')}
      WHERE "PK_INP_BELEGE_ALL" = $${paramCount}
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, values);
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.json({
      status: 'success',
      message: 'Document updated successfully',
      updatedFields: Object.keys(validUpdateFields),
      updatedRecord: updateResult.rows[0]
    });
    
  } catch (err) {
    // Rollback on error
    if (client) await client.query('ROLLBACK');
    console.error('Database error:', err);
    
    // Handle specific error cases
    let errorMessage = 'Failed to update document';
    let statusCode = 500;
    
    if (err.code === '23503') { // Foreign key violation
      errorMessage = 'Foreign key constraint violation - referenced record does not exist';
      statusCode = 400;
    } else if (err.code === '23505') { // Unique constraint violation
      errorMessage = 'Unique constraint violation - duplicate value';
      statusCode = 400;
    } else if (err.code === '23514') { // Check constraint violation
      errorMessage = 'Check constraint violation - invalid data';
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      status: 'error',
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      details: process.env.NODE_ENV === 'development' ? err.detail : undefined
    });
  } finally {
    if (client) client.release();
  }
});

// Additional endpoint for partial updates with PATCH method
app.patch('/update-belege-all/:id', async (req, res) => {
  // Reuse the same logic as PUT
  await exports.updateBelegeAll(req, res);
});


app.post("/document/add_rel", async (req, res) => {
    try {
        const { fk_main_key, fk_inp_belege_all } = req.body;

        // Validate required field
        if (!fk_main_key) {
            return res.status(400).json({
                error: "FK_MAIN_KEY is required",
                received: req.body
            });
        }

 

        // Database operation to insert document
        const result = await pool.query(
            ` insert into "COMPANY"."T_REL_LEX_KTO_BEL" ("FK_MAIN_KEY", "FK_INP_BELEGE_ALL", "FLG_LEXOFFICE_BUCHUNG","FLG_LEXOFFICE_MIT_BILD")
 select  	 	 		 	  	  	 	 	 	 	 	 	 	 	  	$1,$2,1,0
returning *`,
            [fk_main_key, fk_inp_belege_all]  // Now using both parameters
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "No matching record found in T_KTO_GIROKONTO",
                details: `No record with FK_MAIN_KEY = ${fk_main_key}`
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

app.post("/buchung/add_rel_kontoauszug", async (req, res) => {
    try {
        const { fk_main_key, fk_kto_konto_auszug } = req.body;

        // Validate required fields
        if (!fk_main_key || !fk_kto_konto_auszug) {
            return res.status(400).json({
                success: false,
                error: "Both FK_MAIN_KEY and FK_KTO_KONTO_AUSZUG are required",
                received: req.body
            });
        }

        // Validate that values are numbers
        if (isNaN(Number(fk_main_key)) || isNaN(Number(fk_kto_konto_auszug))) {
            return res.status(400).json({
                success: false,
                error: "Both FK_MAIN_KEY and FK_KTO_KONTO_AUSZUG must be valid numbers",
                received: req.body
            });
        }

        // Database operation to insert document
        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_REL_KTO_KONTO_AUSZUG_GIR" ("FK_MAIN_KEY", "FK_KTO_KONTO_AUSZUG") 
             VALUES ($1, $2)`,
            [fk_main_key, fk_kto_konto_auszug]
        );

        // For INSERT operations, check rowCount instead of rows.length
        if (result.rowCount === 0) {
            return res.status(500).json({
                success: false,
                error: "Failed to insert record into T_REL_KTO_KONTO_AUSZUG_GIR"
            });
        }

        // Return success response
        res.status(201).json({
            success: true,
            message: "Relation created successfully",
            data: {
                fk_main_key: fk_main_key,
                fk_kto_konto_auszug: fk_kto_konto_auszug
            }
        });

    } catch (error) {
        console.error("Database error:", error.message);
        
        // Handle unique constraint violations
        if (error.code === '23505') { // PostgreSQL unique violation
            return res.status(409).json({
                success: false,
                error: "Relation already exists",
                details: "This FK_MAIN_KEY and FK_KTO_KONTO_AUSZUG combination already exists in the database"
            });
        }
        
        // Handle foreign key violations
        if (error.code === '23503') { // PostgreSQL foreign key violation
            return res.status(400).json({
                success: false,
                error: "Invalid reference",
                details: "The provided FK_MAIN_KEY or FK_KTO_KONTO_AUSZUG does not exist in the referenced tables"
            });
        }

        res.status(500).json({
            success: false,
            error: "Failed to insert document relation",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});


/**
 * Insert relations between girokonto and konto auszug
 */
app.post('/create-relations', async (req, res) => {
  let client;
  try {
    const { keys, fk_konto_auszug, seite } = req.body;

    // Validate input
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Array of FK_MAIN_KEY values is required',
        example: { "keys": [63614, 63615], "fk_konto_auszug": 117 }
      });
    }

    client = await pool.connect();
    await client.query('BEGIN');

    // Insert relations
    const result = await client.query(`
      INSERT INTO "COMPANY"."T_REL_KTO_KONTO_AUSZUG_GIR" 
        ("FK_MAIN_KEY", "FK_KTO_KONTO_AUSZUG", "SEITE") 
      SELECT "FK_MAIN_KEY", $1, $3
      FROM "COMPANY"."T_KTO_GIROKONTO"
      WHERE "FK_MAIN_KEY" = ANY($2)
      RETURNING "FK_MAIN_KEY"
    `, [fk_konto_auszug, keys, seite]);

    await client.query('COMMIT');

    res.json({
      status: 'success',
      message: `Created ${result.rowCount} relations`,
      fk_konto_auszug: fk_konto_auszug,
      related_keys: result.rows.map(row => row.FK_MAIN_KEY)
    });

  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    console.error('Database error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create relations',
      error: process.env.NODE_ENV === 'development' ? {
        message: err.message,
        detail: err.detail,
        hint: err.hint
      } : undefined
    });
  } finally {
    if (client) client.release();
  }
});


app.post('/new_girokonto', async (req, res) => {
  let client;
  try {
    const { fk_kto_bankkonto, buchungsdatum,  description, details, amount } = req.body;



    client = await pool.connect();
    await client.query('BEGIN');

    // Insert relations
    const result = await client.query(`
       INSERT INTO "COMPANY"."T_KTO_GIROKONTO" (
        "FK_KTO_BANKKONTO",
        "BUCHUNGSTAG",
        "BUCHUNGSTEXT",
        "BUCHUNGSTEXT1",
        "BETRAG",
        "WAEHRUNG",
        "FK_MAIN_KEY"
      ) 
      SELECT 
        $1,
        TO_DATE($2, 'YYYY-MM-DD'),
        $3,
        $4,
        $5::DOUBLE PRECISION,
        'EUR',
        nextval('"COMPANY"."KTO_KONTO_SEQ"') 
      RETURNING "FK_MAIN_KEY"
    `, [fk_kto_bankkonto, buchungsdatum,  description, details, amount]);

    await client.query('COMMIT');


    
   


     const fk_main_key = result.rows[0].FK_MAIN_KEY;

    res.json({
      status: 'success',
      message: `Created ${result.rowCount} Girokontoeinträge`,
      fk_main_key: fk_main_key,
    });

  } catch (err) {
    if (client) {
      await client.query('ROLLBACK');
      client.release();
    }
    console.error('Database error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to create relations',
      error: process.env.NODE_ENV === 'development' ? {
        message: err.message,
        detail: err.detail,
        hint: err.hint
      } : undefined
    });
  } finally {
    if (client) client.release();
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

app.post("/add_person_group_rel", async (req, res) => {
    try {
        const { FK_KON_PERSON_GROUP, FK_KON_PERSON } = req.body;

        // Validate required fields
        if (!FK_KON_PERSON_GROUP || !FK_KON_PERSON) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: FK_KON_PERSON_GROUP and FK_KON_PERSON are required"
            });
        }

        // Check if the relation already exists
        const checkQuery = `
            SELECT COUNT(*) as count 
            FROM "COMPANY"."T_REL_KON_PERSON_PERSON_GROUP" 
            WHERE "FK_KON_PERSON_GROUP" = $1 AND "FK_KON_PERSON" = $2
        `;
        
        const checkResult = await pool.query(checkQuery, [FK_KON_PERSON_GROUP, FK_KON_PERSON]);
        
        if (parseInt(checkResult.rows[0].count) > 0) {
            return res.status(409).json({
                success: false,
                error: "Relation already exists"
            });
        }

        // Database operation to insert document
        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_REL_KON_PERSON_PERSON_GROUP" 
             ("FK_KON_PERSON_GROUP", "FK_KON_PERSON")
             VALUES ($1, $2)`,
            [FK_KON_PERSON_GROUP, FK_KON_PERSON]
        );

        // Return success response
        res.status(201).json({
            success: true,
            message: "Relation created successfully"
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert relation",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});


app.post("/add_person_bild_rel", async (req, res) => {
    try {
        const { FK_KON_PERSON, FK_BILD_BILDER } = req.body;

        // Validate required fields
        if (!FK_BILD_BILDER || !FK_KON_PERSON) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields: FK_KON_PERSON and FK_BILD_BILDER are required"
            });
        }

        // Check if the relation already exists
        const checkQuery = `
            SELECT COUNT(*) as count 
            FROM "COMPANY"."T_REL_KON_PERSON_BILD" 
            WHERE "FK_BILD_BILDER" = $1 AND "FK_KON_PERSON" = $2
        `;
        
        const checkResult = await pool.query(checkQuery, [FK_BILD_BILDER, FK_KON_PERSON]);
        
        if (parseInt(checkResult.rows[0].count) > 0) {
            return res.status(409).json({
                success: false,
                error: "Relation already exists"
            });
        }

        // Database operation to insert document
        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_REL_KON_PERSON_BILD" 
             ("FK_KON_PERSON", "FK_BILD_BILDER")
             VALUES ($1, $2)`,
            [FK_KON_PERSON, FK_BILD_BILDER]
        );

        // Return success response
        res.status(201).json({
            success: true,
            message: "Relation created successfully"
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert relation",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});




app.put("/accounts/final/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { final_cnt, final_amount } = req.body;

        // Validate input fields
        if (!id || isNaN(id) || final_cnt === undefined || final_amount === undefined) {
            return res.status(400).json({ error: "Invalid input data" });
        }

        // Convert to numbers explicitly
        const finalCnt = Number(final_cnt);
        const finalAmount = Number(final_amount);

        // Additional number validation
        if (isNaN(finalCnt) || isNaN(finalAmount)) {
            return res.status(400).json({ error: "Count and amount must be valid numbers" });
        }

        const result = await pool.query(
            `UPDATE "COMPANY"."T_KTO_KONTO_AUSZUG" 
             SET "FINAL_CNT" = $1, "FINAL_AMOUNT" = $2 
             WHERE "PK_KTO_KONTO_AUSZUG" = $3 
             RETURNING *`,
            [finalCnt, finalAmount, id]  // Use the converted numbers
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Record not found or no changes made." });
        }

        res.status(200).json({ 
            message: "Account data updated successfully", 
            data: result.rows[0] 
        });
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to update data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/person/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
               pers.*,
               vpers."ORT",
               vpers."LAND",
               vpers.so_ort,
               vpers.so_land
             FROM "COMPANY"."V_KON_PERSON" vpers
              join "COMPANY"."T_KON_PERSON" pers on vpers."PK_KON_PERSON" = pers."PK_KON_PERSON" 
             WHERE pers."PK_KON_PERSON" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


app.get("/geschaeftspartner_kontakt_bild_rel/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `
SELECT 
               *
             FROM "COMPANY"."T_REL_KON_GESCHAEFTSPARTNER_KONTAKT" relkon 
 left join "COMPANY"."T_REL_KON_GESCHAEFTSPARTNER_KONTAKT_ORG_MARKE" relkonmarke on relkon."PK_REL_KON_GESCHAEFTSPARTNER_KONTAKT" = relkonmarke."FK_REL_KON_GESCHAEFTSPARTNER_KONTAKT"
              left join "COMPANY"."T_REL_KON_GESCHAEFTSPARTNER_KONTAKT_ORG_MARKE_BILD" relkonbild on relkonmarke."PK_REL_KON_GESCHAEFTSPARTNER_KONTAKT_ORG_MARKE" = relkonbild."FK_REL_KON_GESCHAEFTSPARTNER_KONTAKT_ORG_MARKE"
left join "COMPANY"."T_BILD_BILDER" bild on bild."PK_BILD_BILDER" = relkonbild."FK_BILD_BILDER"
             WHERE "PK_REL_KON_GESCHAEFTSPARTNER_KONTAKT" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/ahn/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
               *
             FROM "COMPANY"."T_REL_AHN_PERSON_ELTERN" 
             WHERE "FK_KON_PERSON_ELTERN" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/accounts/test1/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Store parameters for error handling
    const requestParams = { id: id || "not provided" };

    // Base query
    const query = `
      SELECT 
          zus."PK_REL_KTO_KONTO_AUSZUG_GIR",
          zus."FK_MAIN_KEY",
          zus."BUCHUNGSTAG",
          zus."BETRAG",
          zus."BUCHUNGSTEXT",
          zus."FK_KTO_KONTO_AUSZUG",
          zus."OFFENER_BETRAG",
          zus."TBL",
          zus."FK_KTO_BANKKONTO",
          aus."FINAL_CNT",
          aus."FINAL_AMOUNT",
          zus."SEITE",
          zus."STATUS",
          zus."DATUM_ALL_OK",
          zus."DATUM_LOAD",
          zus."DATUM_ZUORD_KTO_AUSZUG_OK",
          zus."WAEHRUNG",
          zus."FINAL_CNT_ZUORD_BELEGE",
          zus."KEEP",
          pay."TRANSAKTIONSCODE",
          pay."RECHNUNGSNUMMER",          
          rel."LINK_LEXOFFICE_BUCHUNG",
          rel."FLG_LEXOFFICE_BUCHUNG",
          rel."FLG_LEXOFFICE_MIT_BILD",
          rel."PK_REL_LEX_KTO_BEL",
          rel."FK_INP_BELEGE_ALL",
          su.sum_flg_lexoffice_buchung,
          su.sum_flg_lexoffice_mit_bild,
          su.cnt_link_lexoffice_buchung,
          su.cnt_lexoffice_referenz_nr ,
          inp."TITEL",
          inp."BEZEICHNUNG",
          inp."BRUTTO_BETRAG",
          inp."BELEGDATUM",
          inp."BELEGNUMMER"
      FROM "COMPANY"."V_KTO_KONTEN_ZUS1" zus
        LEFT JOIN "COMPANY"."T_KTO_KONTO_AUSZUG" aus 
          ON zus."FK_KTO_KONTO_AUSZUG" = aus."PK_KTO_KONTO_AUSZUG"
        LEFT JOIN "COMPANY"."T_KTO_PAYPAL" pay 
          ON pay."FK_MAIN_KEY" = zus."FK_MAIN_KEY"
        LEFT JOIN "COMPANY"."T_REL_LEX_KTO_BEL" rel 
          ON rel."FK_MAIN_KEY" = zus."FK_MAIN_KEY"
        left join ( SELECT zus."FK_MAIN_KEY", 
                      SUM(zus."FLG_LEXOFFICE_BUCHUNG") AS sum_flg_lexoffice_buchung, 
                      SUM(zus."FLG_LEXOFFICE_MIT_BILD") AS sum_flg_lexoffice_mit_bild, 
                      COUNT(DISTINCT CASE WHEN zus."LINK_LEXOFFICE_BUCHUNG" IS NOT NULL AND zus."LINK_LEXOFFICE_BUCHUNG" <> '' THEN zus."LINK_LEXOFFICE_BUCHUNG" END) AS     
                      cnt_link_lexoffice_buchung, 
                      COUNT(DISTINCT CASE WHEN zus."LEXOFFICE_REFERENZ_NR" IS NOT NULL AND zus."LEXOFFICE_REFERENZ_NR" <> '' THEN zus."LEXOFFICE_REFERENZ_NR" END) AS                 
                      cnt_lexoffice_referenz_nr 
                    FROM 
                     "COMPANY"."T_REL_LEX_KTO_BEL" zus GROUP BY zus."FK_MAIN_KEY"
                    ) su on su."FK_MAIN_KEY" = zus."FK_MAIN_KEY"
         left join "COMPANY"."T_INP_BELEGE_ALL" inp on rel."FK_INP_BELEGE_ALL" = inp."PK_INP_BELEGE_ALL"
      WHERE zus."FK_KTO_KONTO_AUSZUG" = $1
      ORDER BY zus."FK_MAIN_KEY"
    `;

    // Properly bind parameters
    const params = [parseInt(id, 10)];

    console.log("Executing query:", query, "with values:", params);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      console.warn("No results found", requestParams);
      return res.status(404).json({
        error: "No matching account found",
        parameters: requestParams,
      });
    }

    console.log("Query successful, rows returned:", result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error("Database error:", error.message, { id: req.params.id });
    res.status(500).json({
      error: "Failed to fetch account",
      parameters: { id: req.params.id || "not provided" },
      details:
        process.env.NODE_ENV === "development"
          ? {
              message: error.message,
              stack: error.stack,
              query: error.query,
              parametersUsed: [req.params.id] || "none",
            }
          : undefined,
    });
  }
});


app.get("/accounts/test2/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Store parameters for error handling
    const requestParams = { id: id || "not provided" };

    // Base query
    const query = `
      SELECT 
          zus."PK_REL_KTO_KONTO_AUSZUG_GIR",
          zus."FK_MAIN_KEY",
          zus."BUCHUNGSTAG",
          zus."BETRAG",
          zus."BUCHUNGSTEXT",
          zus."FK_KTO_KONTO_AUSZUG",
          zus."OFFENER_BETRAG",
          zus."TBL",
          zus."FK_KTO_BANKKONTO",
          aus."FINAL_CNT",
          aus."FINAL_AMOUNT",
          zus."SEITE",
          zus."STATUS",
          zus."DATUM_ALL_OK",
          zus."DATUM_LOAD",
          zus."DATUM_ZUORD_KTO_AUSZUG_OK",
          zus."FINAL_CNT_ZUORD_BELEGE",
          pay."TRANSAKTIONSCODE",
          pay."RECHNUNGSNUMMER",
          rel."LINK_LEXOFFICE_BUCHUNG",
          rel."FLG_LEXOFFICE_BUCHUNG",
          rel."FLG_LEXOFFICE_MIT_BILD"
      FROM "COMPANY"."V_KTO_KONTEN_ZUS1" zus
        LEFT JOIN "COMPANY"."T_KTO_KONTO_AUSZUG" aus 
          ON zus."FK_KTO_KONTO_AUSZUG" = aus."PK_KTO_KONTO_AUSZUG"
        LEFT JOIN "COMPANY"."T_KTO_PAYPAL" pay 
          ON pay."FK_MAIN_KEY" = zus."FK_MAIN_KEY"
        LEFT JOIN "COMPANY"."T_REL_LEX_KTO_BEL" rel 
          ON rel."FK_MAIN_KEY" = zus."FK_MAIN_KEY"
      WHERE zus."FK_MAIN_KEY" = $1
      ORDER BY zus."FK_MAIN_KEY"
    `;

    // Properly bind parameters
    const params = [parseInt(id, 10)];

    console.log("Executing query:", query, "with values:", params);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      console.warn("No results found", requestParams);
      return res.status(404).json({
        error: "No matching account found",
        parameters: requestParams,
      });
    }

    console.log("Query successful, rows returned:", result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error("Database error:", error.message, { id: req.params.id });
    res.status(500).json({
      error: "Failed to fetch account",
      parameters: { id: req.params.id || "not provided" },
      details:
        process.env.NODE_ENV === "development"
          ? {
              message: error.message,
              stack: error.stack,
              query: error.query,
              parametersUsed: [req.params.id] || "none",
            }
          : undefined,
    });
  }
});


app.get("/strasse/:id", async (req, res) => {
    try {
        const { id } = req.params;

        // Base query
        let query = `
            SELECT *
            FROM "COMPANY"."T_ADR_STRASSE"
        `;
        
        let values = [];
        let whereClause = '';

        // Add WHERE clause if ID is provided
        if (id) {
            if (isNaN(id)) {
                return res.status(400).json({ error: "Invalid ID - must be a number" });
            }
            whereClause = ' WHERE "FK_ADR_ORT" = $1';
            values = [id];
        }

        // Complete query with ordering
        query += whereClause + ' ORDER BY "Straße"';

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "No records found" + (id ? ` for location ID ${id}` : ""),
                suggestion: id ? "Check if the location ID exists" : "The street table might be empty"
            });
        }

        res.json({
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Database operation failed",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});




app.get("/strasse_hsnr/:id", async (req, res) => {
    try {
        const { id } = req.params;

        let query;
        let values = [];

        if (id) {
            if (isNaN(id)) {
                return res.status(400).json({ error: "Invalid ID" });
            }

            query = `
                SELECT hsnr.*,str."PK_ADR_STRASSE",  str."Straße"
                FROM "COMPANY"."T_ADR_STRASSE_HSNR" hsnr
                 left join "COMPANY"."T_REL_ADR_PLZ_STRASSE" relstr on relstr."PK_REL_ADR_PLZ_STRASSE" = hsnr."FK_REL_ADR_PLZ_STRASSE"
                 left join "COMPANY"."T_ADR_STRASSE" str on  str."PK_ADR_STRASSE" = relstr."FK_ADR_STRASSE"
                WHERE "FK_REL_ADR_PLZ_STRASSE" = $1
            `;
            values = [id];
        } else {
            query = `
                SELECT hsnr.*,str."PK_ADR_STRASSE",  str."Straße"
                FROM "COMPANY"."T_ADR_STRASSE_HSNR" hsnr
  FROM "COMPANY"."T_ADR_STRASSE_HSNR" hsnr
                 left join "COMPANY"."T_REL_ADR_PLZ_STRASSE" relstr on relstr."PK_REL_ADR_PLZ_STRASSE" = hsnr."FK_REL_ADR_PLZ_STRASSE"
                 left join "COMPANY"."T_ADR_STRASSE" str on str."PK_ADR_STRASSE" = relstr."FK_ADR_STRASSE"
            `;
        }

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No records found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to fetch data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/rel_plz_ort_strasse/:id", async (req, res) => {
    try {
        const { id } = req.params;

        let query;
        let values = [];

        if (id) {
            if (isNaN(id)) {
                return res.status(400).json({ error: "Invalid ID" });
            }

            query = `
                SELECT relstr.*, str."PK_ADR_STRASSE", str."Straße"
                FROM "COMPANY"."T_REL_ADR_PLZ_STRASSE" relstr
             left join "COMPANY"."T_ADR_STRASSE" str on  str."PK_ADR_STRASSE" = relstr."FK_ADR_STRASSE"
                WHERE "FK_ADR_PLZ_ORT" = $1
            `;
            values = [id];
        } else {
            query = `
                SELECT relstr.*, str."PK_ADR_STRASSE", str."Straße"
                FROM "COMPANY"."T_REL_ADR_PLZ_STRASSE" relstr
             left join "COMPANY"."T_ADR_STRASSE" str on  str."PK_ADR_STRASSE" = relstr."FK_ADR_STRASSE"
            `;
        }

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No records found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to fetch data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// ============================================================================
// NEW ENDPOINT: Insert into T_ABL_ORDNER_PAGE table
// ============================================================================
app.post('/api/insert-abl-ordner', async (req, res) => {
    console.log('\n=== INSERT T_ABL_ORDNER STARTED ===');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    try {
        // Extract all possible fields from request body
        const {
            JAHR,
            ORDNER_NAME,
            DESCR,
            COMM,
            FK_KON_PERSON,
            CREATED_BY,
            CREATED_AT,
            MODIFIED_BY,
            MODIFIED_AT,
            FK_MDT_MANDANT,
            FINAL_CNT_SEITEN
        } = req.body;
        
        // Required fields validation
        if (!JAHR || !ORDNER_NAME) {
            return res.status(400).json({
                success: false,
                error: 'JAHR and ORDNER_NAME are required fields',
                requiredFields: ['JAHR', 'ORDNER_NAME']
            });
        }
        
        console.log('Processing insert with data:', {
            JAHR,
            ORDNER_NAME,
            DESCR,
            COMM,
            FK_KON_PERSON,
            FK_MDT_MANDANT
        });
        
        // Build the insert query dynamically based on provided fields
        let fields = [];
        let values = [];
        let paramCounter = 1;
        
        // Required fields - Use quoted column names for exact case matching
        fields.push('"JAHR"');
        values.push(JAHR);
        paramCounter++;
        
        fields.push('"ORDNER_NAME"');
        values.push(ORDNER_NAME);
        paramCounter++;
        
        // Optional fields - Use quoted column names
        const optionalFields = {
            '"DESCR"': DESCR,
            '"COMM"': COMM,
            '"FK_KON_PERSON"': FK_KON_PERSON,
            '"CREATED_BY"': CREATED_BY || 'API_USER',
            '"CREATED_AT"': CREATED_AT || new Date(),
            '"MODIFIED_BY"': MODIFIED_BY,
            '"MODIFIED_AT"': MODIFIED_AT,
            '"FK_MDT_MANDANT"': FK_MDT_MANDANT,
            '"FINAL_CNT_SEITEN"': FINAL_CNT_SEITEN || 0
        };
        
        for (const [field, value] of Object.entries(optionalFields)) {
            if (value !== undefined && value !== null) {
                fields.push(field);
                values.push(value);
                paramCounter++;
            }
        }
        
        // Build the parameter placeholders ($1, $2, etc.)
        const paramPlaceholders = values.map((_, index) => `$${index + 1}`).join(', ');
        
        const insertQuery = `
            INSERT INTO "COMPANY"."T_ABL_ORDNER"
            (${fields.join(', ')})
            VALUES (${paramPlaceholders})
            RETURNING "PK_ABL_ORDNER", ${fields.join(', ')}
        `;
        
        console.log('Generated SQL Query:', insertQuery);
        console.log('Query Parameters:', values);
        
        // Execute the insert
        const result = await pool.query(insertQuery, values);
        const insertedRecord = result.rows[0];
        
        console.log('✅ Record inserted successfully:', insertedRecord);
        console.log('=== INSERT T_ABL_ORDNER COMPLETED ===\n');
        
        res.status(201).json({
            success: true,
            message: 'Record inserted successfully into T_ABL_ORDNER',
            data: insertedRecord,
            insertedId: insertedRecord.PK_ABL_ORDNER
        });
        
    } catch (error) {
        console.error('❌ Error inserting into T_ABL_ORDNER:', error.message);
        console.error('Full error:', error);
        
        // Handle specific PostgreSQL errors
        let errorMessage = 'Database error occurred';
        let errorDetails = {};
        
        if (error.code === '23505') { // Unique violation
            errorMessage = 'Duplicate ordner name for this year. Each ordner name must be unique per year.';
            errorDetails.constraint = error.constraint;
        } else if (error.code === '23503') { // Foreign key violation
            errorMessage = 'Foreign key constraint violation. Check referenced records.';
            errorDetails.constraint = error.constraint;
        } else if (error.code === '23502') { // Not null violation
            errorMessage = 'Required field is missing or null.';
        } else if (error.code === '22P02') { // Invalid text representation
            errorMessage = 'Invalid data type for one or more fields.';
        } else if (error.code === '23514') { // Check constraint violation
            errorMessage = 'Check constraint violation (e.g., negative count values).';
        }
        
        res.status(500).json({
            success: false,
            error: errorMessage,
            details: error.message,
            code: error.code,
            ...errorDetails
        });
    }
});
// ============================================================================
// NEW ENDPOINT: Bulk insert into T_ABL_ORDNER_PAGE
// ============================================================================
app.post('/api/bulk-insert-abl-ordner-page', async (req, res) => {
    console.log('\n=== BULK INSERT T_ABL_ORDNER_PAGE STARTED ===');
    
    try {
        const records = req.body.records || [];
        const ordnerId = req.body.FK_ABL_ORDNER;
        
        if (!ordnerId && (!Array.isArray(records) || records.length === 0)) {
            return res.status(400).json({
                success: false,
                error: 'Either records array or FK_ABL_ORDNER with pages array is required',
                examples: {
                    option1: {
                        records: [
                            { FK_ABL_ORDNER: 1, PAGE_NUMBER: 1, DESCR: 'Page 1' },
                            { FK_ABL_ORDNER: 1, PAGE_NUMBER: 2, DESCR: 'Page 2' }
                        ]
                    },
                    option2: {
                        FK_ABL_ORDNER: 1,
                        pages: [
                            { PAGE_NUMBER: 1, DESCR: 'Page 1' },
                            { PAGE_NUMBER: 2, DESCR: 'Page 2' }
                        ]
                    }
                }
            });
        }
        
        // Handle second format: FK_ABL_ORDNER with pages array
        let processedRecords = records;
        if (ordnerId && req.body.pages) {
            processedRecords = req.body.pages.map(page => ({
                FK_ABL_ORDNER: ordnerId,
                ...page
            }));
        }
        
        console.log(`Processing ${processedRecords.length} page records for bulk insert`);
        
        const results = [];
        const errors = [];
        
        for (let i = 0; i < processedRecords.length; i++) {
            const record = processedRecords[i];
            
            try {
                console.log(`Processing page ${i + 1}/${processedRecords.length}:`, {
                    ordner: record.FK_ABL_ORDNER,
                    page: record.PAGE_NUMBER
                });
                
                // Validate required fields
                if (!record.FK_ABL_ORDNER || !record.PAGE_NUMBER) {
                    errors.push({
                        index: i,
                        record,
                        error: 'Missing required fields: FK_ABL_ORDNER and PAGE_NUMBER are required'
                    });
                    continue;
                }
                
                // Prepare record with defaults
                const recordWithDefaults = {
                    FK_ABL_ORDNER: record.FK_ABL_ORDNER,
                    PAGE_NUMBER: record.PAGE_NUMBER,
                    DESCR: record.DESCR || `Page ${record.PAGE_NUMBER}`,
                    COMM: record.COMM || null,
                    CREATED_BY: record.CREATED_BY || 'BULK_INSERT',
                    CREATED_AT: record.CREATED_AT || new Date(),
                    MODIFIED_BY: record.MODIFIED_BY || null,
                    MODIFIED_AT: record.MODIFIED_AT || null,
                    FK_MDT_MANDANT: record.FK_MDT_MANDANT || null,
                    FK_STD_GEBUCHT: record.FK_STD_GEBUCHT || null,
                    FK_STD_ERFASST: record.FK_STD_ERFASST || null,
                    FK_STD_EIGENE_FREMD: record.FK_STD_EIGENE_FREMD || null,
                    FK_STD_BILD_VORHANDEN: record.FK_STD_BILD_VORHANDEN || null,
                    FK_STD_ZUGEORDNET: record.FK_STD_ZUGEORDNET || null,
                    FK_STD_SONSTIGE: record.FK_STD_SONSTIGE || null,
                    DATUM_BELEGE_ALL_OK: record.DATUM_BELEGE_ALL_OK || null,
                    FINAL_CNT_BELEGE: record.FINAL_CNT_BELEGE || 0,
                    FINAL_CNT_ORIG_APP_OVERVIEW: record.FINAL_CNT_ORIG_APP_OVERVIEW || 0,
                    FINAL_CNT_ORIG_BELEGE: record.FINAL_CNT_ORIG_BELEGE || 0,
                    FINAL_CNT_ORIG_BUCHUNGEN: record.FINAL_CNT_ORIG_BUCHUNGEN || 0,
                    DATUM_OK_ORIG_APP_OVERVIEW: record.DATUM_OK_ORIG_APP_OVERVIEW || null,
                    FINAL_CNT_ZUGEORD_BELEGE_FINALIZED: record.FINAL_CNT_ZUGEORD_BELEGE_FINALIZED || 0,
                    FINAL_CNT_ZUGEORD_BELEGE_NOT_FINALIZABLE: record.FINAL_CNT_ZUGEORD_BELEGE_NOT_FINALIZABLE || 0,
                    FINAL_CNT_BILDER: record.FINAL_CNT_BILDER || 0
                };
                
                // Build query
                const fields = Object.keys(recordWithDefaults);
                const values = Object.values(recordWithDefaults);
                const paramPlaceholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
                
                const insertQuery = `
                    INSERT INTO "COMPANY"."T_ABL_ORDNER_PAGE" 
                    (${fields.join(', ')})
                    VALUES (${paramPlaceholders})
                    RETURNING PK_ABL_ORDNER_PAGE, FK_ABL_ORDNER, PAGE_NUMBER, DESCR
                `;
                
                const result = await pool.query(insertQuery, values);
                const inserted = result.rows[0];
                
                results.push({
                    success: true,
                    index: i,
                    record: inserted
                });
                
                console.log(`✅ Page ${i + 1} inserted:`, `Ordner ${inserted.FK_ABL_ORDNER}, Page ${inserted.PAGE_NUMBER}`);
                
            } catch (recordError) {
                console.error(`❌ Error inserting page ${i + 1}:`, recordError.message);
                errors.push({
                    index: i,
                    record,
                    error: recordError.message,
                    code: recordError.code
                });
            }
        }
        
        console.log(`=== BULK INSERT COMPLETED ===`);
        console.log(`Success: ${results.length}, Errors: ${errors.length}\n`);
        
        res.json({
            success: true,
            message: `Bulk insert completed: ${results.length} successful, ${errors.length} failed`,
            summary: {
                total: processedRecords.length,
                successful: results.length,
                failed: errors.length
            },
            results: results,
            errors: errors
        });
        
    } catch (error) {
        console.error('❌ Bulk insert error:', error);
        res.status(500).json({
            success: false,
            error: 'Bulk insert failed',
            details: error.message
        });
    }
});


app.post('/abl-ordner-page/insert', async (req, res) => {
  const body = req.body;
  
  const sql = `
    INSERT INTO "COMPANY"."T_ABL_ORDNER_PAGE" (
      "FK_ABL_ORDNER", 
      "PAGE_NUMBER", 
      "DESCR", 
      "COMM", 
      "CREATED_BY", 
      "CREATED_AT", 
      "MODIFIED_BY", 
      "MODIFIED_AT", 
      "FK_MDT_MANDANT", 
      "FK_STD_GEBUCHT", 
      "FK_STD_ERFASST", 
      "FK_STD_EIGENE_FREMD", 
      "FK_STD_BILD_VORHANDEN", 
      "FK_STD_ZUGEORDNET", 
      "FK_STD_SONSTIGE", 
      "DATUM_BELEGE_ALL_OK", 
      "FINAL_CNT_BELEGE", 
      "FINAL_CNT_ORIG_APP_OVERVIEW", 
      "FINAL_CNT_ORIG_BELEGE", 
      "FINAL_CNT_ORIG_BUCHUNGEN", 
      "DATUM_OK_ORIG_APP_OVERVIEW", 
      "FINAL_CNT_ZUGEORD_BELEGE_FINALIZED", 
      "FINAL_CNT_ZUGEORD_BELEGE_NOT_FINALIZABLE", 
      "FINAL_CNT_BILDER"
    ) VALUES (
      $1, $2, $3, $4, $5, NOW(), $6, NOW(), 
      $7, $8, $9, $10, $11, $12, $13, $14, 
      $15, $16, $17, $18, $19, $20, $21, $22
    ) RETURNING *;
  `;
  
  const params = [
    body.FK_ABL_ORDNER ?? null,
    body.PAGE_NUMBER ?? null,
    body.DESCR ?? null,
    body.COMM ?? null,
    body.CREATED_BY ?? null,
    body.MODIFIED_BY ?? null,
    body.FK_MDT_MANDANT ?? null,
    body.FK_STD_GEBUCHT ?? null,
    body.FK_STD_ERFASST ?? null,
    body.FK_STD_EIGENE_FREMD ?? null,
    body.FK_STD_BILD_VORHANDEN ?? null,
    body.FK_STD_ZUGEORDNET ?? null,
    body.FK_STD_SONSTIGE ?? null,
    body.DATUM_BELEGE_ALL_OK ?? null,
    body.FINAL_CNT_BELEGE ?? null,
    body.FINAL_CNT_ORIG_APP_OVERVIEW ?? null,
    body.FINAL_CNT_ORIG_BELEGE ?? null,
    body.FINAL_CNT_ORIG_BUCHUNGEN ?? null,
    body.DATUM_OK_ORIG_APP_OVERVIEW ?? null,
    body.FINAL_CNT_ZUGEORD_BELEGE_FINALIZED ?? null,
    body.FINAL_CNT_ZUGEORD_BELEGE_NOT_FINALIZABLE ?? null,
    body.FINAL_CNT_BILDER ?? null
  ];
  
  try {
    const { rows } = await pool.query(sql, params);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('INSERT T_ABL_ORDNER_PAGE error:', err);
    res.status(500).json({ 
      error: 'insert_failed',
      details: err.message 
    });
  }
});


// GET - Get all evaluations
app.get('/lehr-bewertung-schueler/getAll', async (req, res) => {
    const sql = `
        SELECT 
            "PK_LEHR_BEWERTUNG_SCHUELER",
            "FK_LEHR_EINSENDEAUFGABE_LEHRER",
            "FK_MDT_MANDANT",
            "CREATED_AT",
            "MODIFIED_AT",
            "DATUM_BEWERTUNG",
            "FK_STD_BEW_BEWERTUNGSTYP",
            "COMM",
            "STAERKEN_UND_POSITIVE_ASPEKTE",
            "VERBESSERUNGSPOTENTIAL",
            "EMPFEHLUNG_NAECHSTE_SCHRITTE",
            "GESAMTURTEIL",
            "FK_KON_PERSON_SCHUELER",
            "INHALT_SKALA",
            "INHALT_TEXT",
            "INHALT_WERT",
            "KORREKTHEIT_SKALA",
            "KORREKTHEIT_TEXT",
            "KORREKTHEIT_WERT",
            "VERFUEGBARE_SPRACHLICHE_MITTEL_SKALA",
            "VERFUEGBARE_SPRACHLICHE_MITTEL_TEXT",
            "VERFUEGBARE_SPRACHLICHE_MITTEL_WERT"
        FROM "COMPANY"."T_LEHR_BEWERTUNG_SCHUELER"
        ORDER BY "DATUM_BEWERTUNG" DESC, "CREATED_AT" DESC
        LIMIT 100;
    `;
    
    try {
        const { rows } = await pool.query(sql);
        res.status(200).json(rows);
    } catch (err) {
        console.error('GET ALL T_LEHR_BEWERTUNG_SCHUELER error:', err);
        res.status(500).json({ error: 'fetch_failed', details: err.message });
    }
});

// GET - Get single evaluation by ID
app.get('/lehr-bewertung-schueler/get/:id', async (req, res) => {
    const { id } = req.params;
    
    const sql = `
        SELECT 
            "PK_LEHR_BEWERTUNG_SCHUELER",
            "FK_LEHR_EINSENDEAUFGABE_LEHRER",
            "FK_MDT_MANDANT",
            "CREATED_AT",
            "MODIFIED_AT",
            "DATUM_BEWERTUNG",
            "FK_STD_BEW_BEWERTUNGSTYP",
            "COMM",
            "STAERKEN_UND_POSITIVE_ASPEKTE",
            "VERBESSERUNGSPOTENTIAL",
            "EMPFEHLUNG_NAECHSTE_SCHRITTE",
            "GESAMTURTEIL",
            "FK_KON_PERSON_SCHUELER",
            "INHALT_SKALA",
            "INHALT_TEXT",
            "INHALT_WERT",
            "KORREKTHEIT_SKALA",
            "KORREKTHEIT_TEXT",
            "KORREKTHEIT_WERT",
            "VERFUEGBARE_SPRACHLICHE_MITTEL_SKALA",
            "VERFUEGBARE_SPRACHLICHE_MITTEL_TEXT",
            "VERFUEGBARE_SPRACHLICHE_MITTEL_WERT"
        FROM "COMPANY"."T_LEHR_BEWERTUNG_SCHUELER"
        WHERE "PK_LEHR_BEWERTUNG_SCHUELER" = $1;
    `;
    
    try {
        const { rows } = await pool.query(sql, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'not_found' });
        }
        
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error(`GET T_LEHR_BEWERTUNG_SCHUELER ${id} error:`, err);
        res.status(500).json({ error: 'fetch_failed', details: err.message });
    }
});

// PUT - Update evaluation
app.put('/lehr-bewertung-schueler/update/:id', async (req, res) => {
    const { id } = req.params;
    const c = mapBodyToColumns(req.body);
    
    const sql = `
        UPDATE "COMPANY"."T_LEHR_BEWERTUNG_SCHUELER"
        SET
            "FK_LEHR_EINSENDEAUFGABE_LEHRER" = $1,
            "FK_MDT_MANDANT" = $2,
            "MODIFIED_AT" = NOW(),
            "DATUM_BEWERTUNG" = $3,
            "FK_STD_BEW_BEWERTUNGSTYP" = $4,
            "COMM" = $5,
            "STAERKEN_UND_POSITIVE_ASPEKTE" = $6,
            "VERBESSERUNGSPOTENTIAL" = $7,
            "EMPFEHLUNG_NAECHSTE_SCHRITTE" = $8,
            "GESAMTURTEIL" = $9,
            "FK_KON_PERSON_SCHUELER" = $10,
            "INHALT_SKALA" = $11,
            "INHALT_TEXT" = $12,
            "INHALT_WERT" = $13,
            "KORREKTHEIT_SKALA" = $14,
            "KORREKTHEIT_TEXT" = $15,
            "KORREKTHEIT_WERT" = $16,
            "VERFUEGBARE_SPRACHLICHE_MITTEL_SKALA" = $17,
            "VERFUEGBARE_SPRACHLICHE_MITTEL_TEXT" = $18,
            "VERFUEGBARE_SPRACHLICHE_MITTEL_WERT" = $19
        WHERE "PK_LEHR_BEWERTUNG_SCHUELER" = $20
        RETURNING "PK_LEHR_BEWERTUNG_SCHUELER", "MODIFIED_AT";
    `;
    
    const params = [
        c.FK_LEHR_EINSENDEAUFGABE_LEHRER,
        c.FK_MDT_MANDANT,
        c.DATUM_BEWERTUNG,
        c.FK_STD_BEW_BEWERTUNGSTYP,
        c.COMM,
        c.STAERKEN_UND_POSITIVE_ASPEKTE,
        c.VERBESSERUNGSPOTENTIAL,
        c.EMPFEHLUNG_NAECHSTE_SCHRITTE,
        c.GESAMTURTEIL,
        c.FK_KON_PERSON_SCHUELER,
        c.INHALT_SKALA,
        c.INHALT_TEXT,
        c.INHALT_WERT,
        c.KORREKTHEIT_SKALA,
        c.KORREKTHEIT_TEXT,
        c.KORREKTHEIT_WERT,
        c.VERFUEGBARE_SPRACHLICHE_MITTEL_SKALA,
        c.VERFUEGBARE_SPRACHLICHE_MITTEL_TEXT,
        c.VERFUEGBARE_SPRACHLICHE_MITTEL_WERT,
        id
    ];
    
    try {
        const { rows } = await pool.query(sql, params);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'not_found' });
        }
        
        res.status(200).json(rows[0]);
    } catch (err) {
        console.error(`UPDATE T_LEHR_BEWERTUNG_SCHUELER ${id} error:`, err);
        res.status(500).json({ error: 'update_failed', details: err.message });
    }
});

// DELETE - Delete evaluation
app.delete('/lehr-bewertung-schueler/delete/:id', async (req, res) => {
    const { id } = req.params;
    
    const sql = `
        DELETE FROM "COMPANY"."T_LEHR_BEWERTUNG_SCHUELER"
        WHERE "PK_LEHR_BEWERTUNG_SCHUELER" = $1
        RETURNING "PK_LEHR_BEWERTUNG_SCHUELER";
    `;
    
    try {
        const { rows } = await pool.query(sql, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'not_found' });
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Evaluation deleted successfully',
            deletedId: rows[0].PK_LEHR_BEWERTUNG_SCHUELER
        });
    } catch (err) {
        console.error(`DELETE T_LEHR_BEWERTUNG_SCHUELER ${id} error:`, err);
        res.status(500).json({ error: 'delete_failed', details: err.message });
    }
});

app.put('/rel-org-org-unit-lehr-einsendeaufgabe/update/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'invalid_id' });
    }

    const {
      fk_mdt_mandant,
      fk_org_unit,
      fk_lehr_einsendeaufgabe,
    } = req.body || {};

    const sets = [];
    const values = [];
    let idx = 1;

    if (fk_mdt_mandant != null) {
      sets.push(`"FK_MDT_MANDANT" = $${idx++}`);
      values.push(fk_mdt_mandant);
    }
    if (fk_org_unit != null) {
      sets.push(`"FK_ORG_UNIT" = $${idx++}`);
      values.push(fk_org_unit);
    }
    if (fk_lehr_einsendeaufgabe != null) {
      sets.push(`"FK_LEHR_EINSENDEAUFGABE" = $${idx++}`);
      values.push(fk_lehr_einsendeaufgabe);
    }

    if (sets.length === 0) {
      return res.status(400).json({ error: 'no_fields_to_update' });
    }

    values.push(id);
    const sql = `
      UPDATE "COMPANY"."T_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE"
      SET ${sets.join(', ')}
      WHERE "PK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE" = $${idx}
      RETURNING
        "PK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE",
        "FK_MDT_MANDANT",
        "FK_ORG_UNIT",
        "FK_LEHR_EINSENDEAUFGABE"
    `;

    const result = await db.query(sql, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'not_found' });
    }

    res.json(mapRow(result.rows[0]));
  } catch (err) {
    console.error('PUT /rel-org-org-unit-lehr-einsendeaufgabe/:id error:', err);

    if (err.code === '23503') {
      return res.status(409).json({ error: 'foreign_key_violation' });
    }

    res.status(500).json({ error: 'internal_error' });
  }
});

// GET /:id
app.get('/rel-org-org-unit-lehr-einsendeaufgabe/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'invalid_id' });
    }

    const sql = `
      SELECT
        "PK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE",
        "FK_MDT_MANDANT",
        "FK_ORG_UNIT",
        "FK_LEHR_EINSENDEAUFGABE"
      FROM "COMPANY"."T_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE"
      WHERE "PK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE" = $1
    `;
    const result = await pool.query(sql, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'not_found' });
    }

    res.json(mapRow(result.rows[0]));
  } catch (err) {
    console.error('GET /rel-org-org-unit-lehr-einsendeaufgabe/:id error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});


app.post('/rel-org-org-unit-lehr-einsendeaufgabe/insert', async (req, res) => {
  try {
    const {
      fk_mdt_mandant,
      fk_org_unit,
      fk_lehr_einsendeaufgabe,
    } = req.body || {};

    if (
      fk_mdt_mandant == null ||
      fk_org_unit == null ||
      fk_lehr_einsendeaufgabe == null
    ) {
      return res.status(400).json({ error: 'missing_required_fields' });
    }

    const sql = `
      INSERT INTO "COMPANY"."T_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE" (
        "FK_MDT_MANDANT",
        "FK_ORG_UNIT",
        "FK_LEHR_EINSENDEAUFGABE"
      )
      VALUES ($1, $2, $3)
      RETURNING
        "PK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE",
        "FK_MDT_MANDANT",
        "FK_ORG_UNIT",
        "FK_LEHR_EINSENDEAUFGABE"
    `;

    const values = [fk_mdt_mandant, fk_org_unit, fk_lehr_einsendeaufgabe];
    const result = await pool.query(sql, values);

    res.status(201).json(mapRow(result.rows[0]));
  } catch (err) {
    console.error('POST /rel-org-org-unit-lehr-einsendeaufgabe error:', err);

    // You can branch on err.code for FK violations, etc.
    // e.g. 23503 = foreign_key_violation
    if (err.code === '23503') {
      return res.status(409).json({ error: 'foreign_key_violation' });
    }

    res.status(500).json({ error: 'internal_error' });
  }
});

// DELETE /rel-org-org-unit-lehr-einsendeaufgabe/:id
app.delete('/rel-org-org-unit-lehr-einsendeaufgabe/delete/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'invalid_id' });
    }

    const sql = `
      DELETE FROM "COMPANY"."T_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE"
      WHERE "PK_REL_ORG_ORG_UNIT_LEHR_EINSENDEAUFGABE" = $1
    `;
    const result = await pool.query(sql, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'not_found' });
    }

    res.status(204).send();
  } catch (err) {
    console.error('DELETE /rel-org-org-unit-lehr-einsendeaufgabe/:id error:', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// OPTIONAL: Search/filter endpoint
app.get('/lehr-bewertung-schueler/search', async (req, res) => {
    const { schuelerId, lehrerId, startDate, endDate, bewertungstyp } = req.query;
    
    let sql = `
        SELECT 
            "PK_LEHR_BEWERTUNG_SCHUELER",
            "FK_LEHR_EINSENDEAUFGABE_LEHRER",
            "FK_MDT_MANDANT",
            "CREATED_AT",
            "MODIFIED_AT",
            "DATUM_BEWERTUNG",
            "FK_STD_BEW_BEWERTUNGSTYP",
            "COMM",
            "STAERKEN_UND_POSITIVE_ASPEKTE",
            "VERBESSERUNGSPOTENTIAL",
            "EMPFEHLUNG_NAECHSTE_SCHRITTE",
            "GESAMTURTEIL",
            "FK_KON_PERSON_SCHUELER"
        FROM "COMPANY"."T_LEHR_BEWERTUNG_SCHUELER"
        WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (schuelerId) {
        sql += ` AND "FK_KON_PERSON_SCHUELER" = $${paramIndex}`;
        params.push(schuelerId);
        paramIndex++;
    }
    
    if (lehrerId) {
        sql += ` AND "FK_LEHR_EINSENDEAUFGABE_LEHRER" = $${paramIndex}`;
        params.push(lehrerId);
        paramIndex++;
    }
    
    if (startDate) {
        sql += ` AND "DATUM_BEWERTUNG" >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
    }
    
    if (endDate) {
        sql += ` AND "DATUM_BEWERTUNG" <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
    }
    
    if (bewertungstyp) {
        sql += ` AND "FK_STD_BEW_BEWERTUNGSTYP" = $${paramIndex}`;
        params.push(bewertungstyp);
        paramIndex++;
    }
    
    sql += ` ORDER BY "DATUM_BEWERTUNG" DESC, "CREATED_AT" DESC LIMIT 100;`;
    
    try {
        const { rows } = await pool.query(sql, params);
        res.status(200).json(rows);
    } catch (err) {
        console.error('SEARCH T_LEHR_BEWERTUNG_SCHUELER error:', err);
        res.status(500).json({ error: 'search_failed', details: err.message });
    }
});

// ============================================================================
// NEW ENDPOINT: Get all pages from T_ABL_ORDNER_PAGE
// ============================================================================
app.get('/api/abl-ordner-page', async (req, res) => {
    try {
        const { ordner_id, page_number, limit = 100, offset = 0 } = req.query;
        
        console.log('Fetching records from T_ABL_ORDNER_PAGE with filters:', {
            ordner_id, page_number, limit, offset
        });
        
        let query = `
            SELECT 
                p.*,
                o."ORDNER_NAME",
                o."JAHR"
            FROM "COMPANY"."T_ABL_ORDNER_PAGE" p
            LEFT JOIN "COMPANY"."T_ABL_ORDNER" o ON p."FK_ABL_ORDNER" = o."PK_ABL_ORDNER"
            WHERE 1=1
        `;
        
        const queryParams = [];
        let paramCount = 1;
        
        if (ordner_id) {
            query += ` AND p."FK_ABL_ORDNER" = $${paramCount}`;
            queryParams.push(parseInt(ordner_id));
            paramCount++;
        }
        
        if (page_number) {
            query += ` AND p."PAGE_NUMBER" = $${paramCount}`;
            queryParams.push(parseInt(page_number));
            paramCount++;
        }
        
        query += ` ORDER BY p."FK_ABL_ORDNER", p."PAGE_NUMBER" LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        queryParams.push(parseInt(limit), parseInt(offset));
        
        console.log('Query:', query);
        console.log('Params:', queryParams);
        
        const result = await pool.query(query, queryParams);
        const countResult = await pool.query(
            'SELECT COUNT(*) as total FROM "COMPANY"."T_ABL_ORDNER_PAGE"'
        );
        
        console.log(`Found ${result.rows.length} page records`);
        
        res.json({
            success: true,
            count: result.rows.length,
            total: parseInt(countResult.rows[0].total),
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching T_ABL_ORDNER_PAGE records:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch records',
            details: error.message
        });
    }
});

// ============================================================================
// NEW ENDPOINT: Get pages by ordner ID
// ============================================================================
app.get('/api/abl-ordner/:ordner_id/pages', async (req, res) => {
    try {
        const { ordner_id } = req.params;
        const { page_number } = req.query;
        
        console.log(`Fetching pages for ordner ID: ${ordner_id}`);
        
        let query = `
            SELECT p.*, o."ORDNER_NAME", o."JAHR"
            FROM "COMPANY"."T_ABL_ORDNER_PAGE" p
            LEFT JOIN "COMPANY"."T_ABL_ORDNER" o ON p."FK_ABL_ORDNER" = o."PK_ABL_ORDNER"
            WHERE p."FK_ABL_ORDNER" = $1
        `;
        
        const queryParams = [ordner_id];
        
        if (page_number) {
            query += ` AND p."PAGE_NUMBER" = $2`;
            queryParams.push(parseInt(page_number));
        }
        
        query += ` ORDER BY p."PAGE_NUMBER"`;
        
        const result = await pool.query(query, queryParams);
        
        if (result.rows.length === 0) {
            // Check if ordner exists
            const ordnerCheck = await pool.query(
                'SELECT "PK_ABL_ORDNER" FROM "COMPANY"."T_ABL_ORDNER" WHERE "PK_ABL_ORDNER" = $1',
                [ordner_id]
            );
            
            if (ordnerCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: `Ordner with ID ${ordner_id} not found`
                });
            }
        }
        
        // Get page count statistics
        const statsQuery = `
            SELECT 
                COUNT(*) as total_pages,
                SUM("FINAL_CNT_BELEGE") as total_belege,
                SUM("FINAL_CNT_BILDER") as total_bilder,
                MIN("PAGE_NUMBER") as min_page,
                MAX("PAGE_NUMBER") as max_page
            FROM "COMPANY"."T_ABL_ORDNER_PAGE"
            WHERE "FK_ABL_ORDNER" = $1
        `;
        
        const statsResult = await pool.query(statsQuery, [ordner_id]);
        
        res.json({
            success: true,
            ordner_id: ordner_id,
            count: result.rows.length,
            statistics: statsResult.rows[0],
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching ordner pages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ordner pages',
            details: error.message
        });
    }
});

// ============================================================================
// NEW ENDPOINT: Get single page by ID
// ============================================================================
app.get('/api/abl-ordner-page/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Fetching T_ABL_ORDNER_PAGE record with ID: ${id}`);
        
        const query = `
            SELECT p.*, o."ORDNER_NAME", o."JAHR", o."DESCR" as ORDNER_DESCR
            FROM "COMPANY"."T_ABL_ORDNER_PAGE" p
            LEFT JOIN "COMPANY"."T_ABL_ORDNER" o ON p."FK_ABL_ORDNER" = o."PK_ABL_ORDNER"
            WHERE p."PK_ABL_ORDNER_PAGE" = $1
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Page record with ID ${id} not found`
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching page record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch page record',
            details: error.message
        });
    }
});

// ============================================================================
// NEW ENDPOINT: Update page record
// ============================================================================
app.put('/api/abl-ordner-page/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        console.log(`Updating T_ABL_ORDNER_PAGE record ID: ${id}`);
        console.log('Update data:', updates);
        
        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No update data provided'
            });
        }
        
        // Remove primary key from updates
        delete updates.PK_ABL_ORDNER_PAGE;
        delete updates.FK_ABL_ORDNER; // Don't allow changing the parent ordner
        
        // Add modification timestamp
        updates.MODIFIED_AT = new Date();
        if (!updates.MODIFIED_BY) {
            updates.MODIFIED_BY = 'API_UPDATE';
        }
        
        // Build SET clause
        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
        
        const values = [id, ...Object.values(updates)];
        
        const updateQuery = `
            UPDATE "COMPANY"."T_ABL_ORDNER_PAGE"
            SET ${setClause}
            WHERE PK_ABL_ORDNER_PAGE = $1
            RETURNING *
        `;
        
        console.log('Update query:', updateQuery);
        
        const result = await pool.query(updateQuery, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Page record with ID ${id} not found`
            });
        }
        
        res.json({
            success: true,
            message: 'Page record updated successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating page record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update page record',
            details: error.message
        });
    }
});

// ============================================================================
// NEW ENDPOINT: Update page statistics/counts
// ============================================================================
app.patch('/api/abl-ordner-page/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const stats = req.body;
        
        console.log(`Updating statistics for page ID: ${id}`);
        console.log('Statistics data:', stats);
        
        // Define allowed statistic fields
        const allowedStats = [
            'FINAL_CNT_BELEGE',
            'FINAL_CNT_ORIG_APP_OVERVIEW',
            'FINAL_CNT_ORIG_BELEGE',
            'FINAL_CNT_ORIG_BUCHUNGEN',
            'FINAL_CNT_ZUGEORD_BELEGE_FINALIZED',
            'FINAL_CNT_ZUGEORD_BELEGE_NOT_FINALIZABLE',
            'FINAL_CNT_BILDER',
            'DATUM_BELEGE_ALL_OK',
            'DATUM_OK_ORIG_APP_OVERVIEW'
        ];
        
        // Filter only allowed stats
        const filteredStats = {};
        for (const [key, value] of Object.entries(stats)) {
            if (allowedStats.includes(key)) {
                filteredStats[key] = value;
            }
        }
        
        if (Object.keys(filteredStats).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No valid statistic fields provided',
                allowedFields: allowedStats
            });
        }
        
        // Add modification info
        filteredStats.MODIFIED_AT = new Date();
        filteredStats.MODIFIED_BY = stats.MODIFIED_BY || 'STATS_UPDATE';
        
        // Build SET clause
        const setClause = Object.keys(filteredStats)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
        
        const values = [id, ...Object.values(filteredStats)];
        
        const updateQuery = `
            UPDATE "COMPANY"."T_ABL_ORDNER_PAGE"
            SET ${setClause}
            WHERE PK_ABL_ORDNER_PAGE = $1
            RETURNING PK_ABL_ORDNER_PAGE, FK_ABL_ORDNER, PAGE_NUMBER, ${Object.keys(filteredStats).join(', ')}
        `;
        
        const result = await pool.query(updateQuery, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Page record with ID ${id} not found`
            });
        }
        
        res.json({
            success: true,
            message: 'Page statistics updated successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating page statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update page statistics',
            details: error.message
        });
    }
});

// ============================================================================
// NEW ENDPOINT: Delete page record
// ============================================================================
app.delete('/api/abl-ordner-page/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Deleting T_ABL_ORDNER_PAGE record with ID: ${id}`);
        
        // First get the record to return info
        const getQuery = `
            SELECT p.PK_ABL_ORDNER_PAGE, p.FK_ABL_ORDNER, p.PAGE_NUMBER, p.DESCR,
                   o.ORDNER_NAME
            FROM "COMPANY"."T_ABL_ORDNER_PAGE" p
            LEFT JOIN "COMPANY"."T_ABL_ORDNER" o ON p.FK_ABL_ORDNER = o.PK_ABL_ORDNER
            WHERE p.PK_ABL_ORDNER_PAGE = $1
        `;
        
        const getResult = await pool.query(getQuery, [id]);
        
        if (getResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Page record with ID ${id} not found`
            });
        }
        
        // Delete the record
        const deleteQuery = `
            DELETE FROM "COMPANY"."T_ABL_ORDNER_PAGE"
            WHERE PK_ABL_ORDNER_PAGE = $1
        `;
        
        await pool.query(deleteQuery, [id]);
        
        res.json({
            success: true,
            message: 'Page record deleted successfully',
            deletedRecord: getResult.rows[0]
        });
        
    } catch (error) {
        console.error('Error deleting page record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete page record',
            details: error.message
        });
    }
});

// ============================================================================
// NEW ENDPOINT: Get page statistics summary
// ============================================================================
app.get('/api/abl-ordner-page-stats', async (req, res) => {
    try {
        const { ordner_id, group_by = 'ordner' } = req.query;
        
        console.log('Fetching page statistics summary');
        
        let query;
        let queryParams = [];
        
        if (group_by === 'ordner') {
            query = `
                SELECT 
                    p."FK_ABL_ORDNER",
                    o."ORDNER_NAME",
                    o."JAHR",
                    COUNT(*) as total_pages,
                    SUM(p."FINAL_CNT_BELEGE") as total_belege,
                    SUM(p."FINAL_CNT_BILDER") as total_bilder,
                    SUM(p."FINAL_CNT_ORIG_BELEGE") as total_orig_belege,
                    SUM(p."FINAL_CNT_ZUGEORD_BELEGE_FINALIZED") as total_finalized,
                    SUM(p."FINAL_CNT_ZUGEORD_BELEGE_NOT_FINALIZABLE") as total_not_finalizable,
                    MIN(p."CREATED_AT") as first_created,
                    MAX(p."MODIFIED_AT") as last_modified
                FROM "COMPANY"."T_ABL_ORDNER_PAGE" p
                LEFT JOIN "COMPANY"."T_ABL_ORDNER" o ON p."FK_ABL_ORDNER" = o."PK_ABL_ORDNER"
                ${ordner_id ? 'WHERE p."FK_ABL_ORDNER" = $1' : ''}
                GROUP BY p."FK_ABL_ORDNER", o."ORDNER_NAME", o."JAHR"
                ORDER BY o."JAHR" DESC, o."ORDNER_NAME"
            `;
            
            if (ordner_id) {
                queryParams.push(ordner_id);
            }
        } else if (group_by === 'status') {
            query = `
                SELECT 
                    COUNT(*) as total_pages,
                    SUM(CASE WHEN "FINAL_CNT_BELEGE" > 0 THEN 1 ELSE 0 END) as pages_with_belege,
                    SUM(CASE WHEN "DATUM_BELEGE_ALL_OK" IS NOT NULL THEN 1 ELSE 0 END) as pages_completed,
                    SUM(CASE WHEN "FK_STD_BILD_VORHANDEN" IS NOT NULL THEN 1 ELSE 0 END) as pages_with_images,
                    SUM(CASE WHEN "FK_STD_GEBUCHT" IS NOT NULL THEN 1 ELSE 0 END) as pages_booked,
                    AVG("FINAL_CNT_BELEGE") as avg_belege_per_page,
                    SUM("FINAL_CNT_BELEGE") as total_all_belege
                FROM "COMPANY"."T_ABL_ORDNER_PAGE"
                ${ordner_id ? 'WHERE "FK_ABL_ORDNER" = $1' : ''}
            `;
            
            if (ordner_id) {
                queryParams.push(ordner_id);
            }
        }
        
        const result = await pool.query(query, queryParams);
        
        res.json({
            success: true,
            group_by: group_by,
            statistics: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching page statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch page statistics',
            details: error.message
        });
    }
});



app.get("/bild/1/:id", async (req, res) => {
    try {
        const { id } = req.params;

        let query;
        let values = [];

       

         query = `
                SELECT *
                FROM "COMPANY"."T_BILD_BILDER" relstr
             
                WHERE "PK_BILD_BILDER" = $1
            `;
            values = [id];
       
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No records found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            error: "Failed to fetch data",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// ============================================================================
// NEW ENDPOINT: Insert into T_ABL_ORDNER table
// ============================================================================
app.post('/api/insert-abl-ordner', async (req, res) => {
    console.log('\n=== INSERT T_ABL_ORDNER STARTED ===');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    try {
        // Extract all possible fields from request body
        const {
            JAHR,
            ORDNER_NAME,
            DESCR,
            COMM,
            CREATED_BY,
            CREATED_AT,
            MODIFIED_BY,
            MODIFIED_AT,
            FK_KON_PERSON,
            FK_MDT_MANDANT,
            ORDNER_BILD,
            DATUM_BELEGE_ALL_OK,
            FINAL_CNT_SEITEN
        } = req.body;
        
        // Required fields validation
        if (!JAHR || !ORDNER_NAME) {
            return res.status(400).json({
                success: false,
                error: 'JAHR and ORDNER_NAME are required fields',
                requiredFields: ['JAHR', 'ORDNER_NAME']
            });
        }
        
        console.log('Processing insert with data:', {
            JAHR, ORDNER_NAME, DESCR, COMM, FK_KON_PERSON, FK_MDT_MANDANT
        });
        
        // Build the insert query dynamically based on provided fields
        let fields = [];
        let values = [];
        let paramCounter = 1;
        
        // Required fields
        fields.push('JAHR');
        values.push(JAHR);
        paramCounter++;
        
        fields.push('ORDNER_NAME');
        values.push(ORDNER_NAME);
        paramCounter++;
        
        // Optional fields
        if (DESCR !== undefined) {
            fields.push('DESCR');
            values.push(DESCR);
            paramCounter++;
        }
        
        if (COMM !== undefined) {
            fields.push('COMM');
            values.push(COMM);
            paramCounter++;
        }
        
        if (CREATED_BY !== undefined) {
            fields.push('CREATED_BY');
            values.push(CREATED_BY);
            paramCounter++;
        } else {
            fields.push('CREATED_BY');
            values.push('SYSTEM');
            paramCounter++;
        }
        
        if (CREATED_AT !== undefined) {
            fields.push('CREATED_AT');
            values.push(CREATED_AT);
            paramCounter++;
        } else {
            fields.push('CREATED_AT');
            values.push(new Date());
            paramCounter++;
        }
        
        if (MODIFIED_BY !== undefined) {
            fields.push('MODIFIED_BY');
            values.push(MODIFIED_BY);
            paramCounter++;
        }
        
        if (MODIFIED_AT !== undefined) {
            fields.push('MODIFIED_AT');
            values.push(MODIFIED_AT);
            paramCounter++;
        }
        
        if (FK_KON_PERSON !== undefined) {
            fields.push('FK_KON_PERSON');
            values.push(FK_KON_PERSON);
            paramCounter++;
        }
        
        if (FK_MDT_MANDANT !== undefined) {
            fields.push('FK_MDT_MANDANT');
            values.push(FK_MDT_MANDANT);
            paramCounter++;
        }
        
        if (ORDNER_BILD !== undefined) {
            fields.push('ORDNER_BILD');
            values.push(ORDNER_BILD);
            paramCounter++;
        }
        
        if (DATUM_BELEGE_ALL_OK !== undefined) {
            fields.push('DATUM_BELEGE_ALL_OK');
            values.push(DATUM_BELEGE_ALL_OK);
            paramCounter++;
        }
        
        if (FINAL_CNT_SEITEN !== undefined) {
            fields.push('FINAL_CNT_SEITEN');
            values.push(FINAL_CNT_SEITEN);
            paramCounter++;
        }
        
        // Build the parameter placeholders ($1, $2, etc.)
        const paramPlaceholders = values.map((_, index) => `$${index + 1}`).join(', ');
        
        const insertQuery = `
            INSERT INTO "COMPANY"."T_ABL_ORDNER" 
            (${fields.join(', ')})
            VALUES (${paramPlaceholders})
            RETURNING PK_ABL_ORDNER, ${fields.join(', ')}
        `;
        
        console.log('Generated SQL Query:', insertQuery);
        console.log('Query Parameters:', values);
        
        // Execute the insert
        const result = await pool.query(insertQuery, values);
        const insertedRecord = result.rows[0];
        
        console.log('✅ Record inserted successfully:', insertedRecord);
        console.log('=== INSERT T_ABL_ORDNER COMPLETED ===\n');
        
        res.status(201).json({
            success: true,
            message: 'Record inserted successfully into T_ABL_ORDNER',
            data: insertedRecord,
            insertedId: insertedRecord.PK_ABL_ORDNER
        });
        
    } catch (error) {
        console.error('❌ Error inserting into T_ABL_ORDNER:', error.message);
        console.error('Full error:', error);
        
        // Handle specific PostgreSQL errors
        let errorMessage = 'Database error occurred';
        let errorDetails = {};
        
        if (error.code === '23505') { // Unique violation
            errorMessage = 'Duplicate record error. Check for unique constraints.';
            errorDetails.constraint = error.constraint;
        } else if (error.code === '23503') { // Foreign key violation
            errorMessage = 'Foreign key constraint violation. Check referenced records.';
            errorDetails.constraint = error.constraint;
        } else if (error.code === '23502') { // Not null violation
            errorMessage = 'Required field is missing or null.';
        } else if (error.code === '22P02') { // Invalid text representation
            errorMessage = 'Invalid data type for one or more fields.';
        }
        
        res.status(500).json({
            success: false,
            error: errorMessage,
            details: error.message,
            code: error.code,
            ...errorDetails
        });
    }
});

// ============================================================================
// NEW ENDPOINT: Bulk insert into T_ABL_ORDNER
// ============================================================================
app.post('/api/bulk-insert-abl-ordner', async (req, res) => {
    console.log('\n=== BULK INSERT T_ABL_ORDNER STARTED ===');
    
    try {
        const records = req.body.records || [];
        
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Records array is required and must not be empty',
                example: {
                    records: [
                        { JAHR: 2024, ORDNER_NAME: 'Test Folder 1', DESCR: 'Description 1' },
                        { JAHR: 2024, ORDNER_NAME: 'Test Folder 2', DESCR: 'Description 2' }
                    ]
                }
            });
        }
        
        console.log(`Processing ${records.length} records for bulk insert`);
        
        const results = [];
        const errors = [];
        
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            
            try {
                console.log(`Processing record ${i + 1}/${records.length}:`, record.ORDNER_NAME);
                
                // Validate required fields
                if (!record.JAHR || !record.ORDNER_NAME) {
                    errors.push({
                        index: i,
                        record,
                        error: 'Missing required fields: JAHR and ORDNER_NAME are required'
                    });
                    continue;
                }
                
                // Prepare record with defaults
                const recordWithDefaults = {
                    JAHR: record.JAHR,
                    ORDNER_NAME: record.ORDNER_NAME,
                    DESCR: record.DESCR || null,
                    COMM: record.COMM || null,
                    CREATED_BY: record.CREATED_BY || 'BULK_INSERT',
                    CREATED_AT: record.CREATED_AT || new Date(),
                    MODIFIED_BY: record.MODIFIED_BY || null,
                    MODIFIED_AT: record.MODIFIED_AT || null,
                    FK_KON_PERSON: record.FK_KON_PERSON || null,
                    FK_MDT_MANDANT: record.FK_MDT_MANDANT || null,
                    ORDNER_BILD: record.ORDNER_BILD || null,
                    DATUM_BELEGE_ALL_OK: record.DATUM_BELEGE_ALL_OK || null,
                    FINAL_CNT_SEITEN: record.FINAL_CNT_SEITEN || null
                };
                
                // Build query
                const fields = Object.keys(recordWithDefaults);
                const values = Object.values(recordWithDefaults);
                const paramPlaceholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
                
                const insertQuery = `
                    INSERT INTO "COMPANY"."T_ABL_ORDNER" 
                    (${fields.join(', ')})
                    VALUES (${paramPlaceholders})
                    RETURNING PK_ABL_ORDNER, ORDNER_NAME, JAHR
                `;
                
                const result = await pool.query(insertQuery, values);
                const inserted = result.rows[0];
                
                results.push({
                    success: true,
                    index: i,
                    record: inserted
                });
                
                console.log(`✅ Record ${i + 1} inserted:`, inserted.ORDNER_NAME);
                
            } catch (recordError) {
                console.error(`❌ Error inserting record ${i + 1}:`, recordError.message);
                errors.push({
                    index: i,
                    record,
                    error: recordError.message,
                    code: recordError.code
                });
            }
        }
        
        console.log(`=== BULK INSERT COMPLETED ===`);
        console.log(`Success: ${results.length}, Errors: ${errors.length}\n`);
        
        res.json({
            success: true,
            message: `Bulk insert completed: ${results.length} successful, ${errors.length} failed`,
            summary: {
                total: records.length,
                successful: results.length,
                failed: errors.length
            },
            results: results,
            errors: errors
        });
        
    } catch (error) {
        console.error('❌ Bulk insert error:', error);
        res.status(500).json({
            success: false,
            error: 'Bulk insert failed',
            details: error.message
        });
    }
});

// ============================================================================
// NEW ENDPOINT: Get all records from T_ABL_ORDNER
// ============================================================================
app.get('/api/abl-ordner', async (req, res) => {
    try {
        console.log('Fetching all records from T_ABL_ORDNER');
        
        const query = `
            SELECT "PK_ABL_ORDNER", "JAHR", "ORDNER_NAME", "DESCR", "COMM", 
                   "CREATED_BY", "CREATED_AT", "MODIFIED_BY", "MODIFIED_AT",
                   "FK_KON_PERSON", "FK_MDT_MANDANT", "ORDNER_BILD",
                   "DATUM_BELEGE_ALL_OK", "FINAL_CNT_SEITEN"
            FROM "COMPANY"."T_ABL_ORDNER"
            ORDER BY "JAHR" DESC, "CREATED_AT" DESC
            LIMIT 100
        `;
        
        const result = await pool.query(query);
        
        console.log(`Found ${result.rows.length} records`);
        
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching T_ABL_ORDNER records:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch records',
            details: error.message
        });
    }
});

// ============================================================================
// NEW ENDPOINT: Get single record by ID
// ============================================================================
app.get('/api/abl-ordner/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Fetching T_ABL_ORDNER record with ID: ${id}`);
        
        const query = `
            SELECT * FROM "COMPANY"."T_ABL_ORDNER"
            WHERE "PK_ABL_ORDNER" = $1
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Record with ID ${id} not found`
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error fetching record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch record',
            details: error.message
        });
    }
});

// ============================================================================
// NEW ENDPOINT: Update record in T_ABL_ORDNER
// ============================================================================
app.put('/api/abl-ordner/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        console.log(`Updating T_ABL_ORDNER record ID: ${id}`);
        console.log('Update data:', updates);
        
        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No update data provided'
            });
        }
        
        // Remove "PK_ABL_ORDNER" from updates if present
        delete updates.PK_ABL_ORDNER;
        
        // Add modification timestamp
        updates.MODIFIED_AT = new Date();
        if (!updates.MODIFIED_BY) {
            updates.MODIFIED_BY = 'API_UPDATE';
        }
        
        // Build SET clause
        const setClause = Object.keys(updates)
            .map((key, index) => `${key} = $${index + 2}`)
            .join(', ');
        
        const values = [id, ...Object.values(updates)];
        
        const updateQuery = `
            UPDATE "COMPANY"."T_ABL_ORDNER"
            SET ${setClause}
            WHERE "PK_ABL_ORDNER" = $1
            RETURNING *
        `;
        
        console.log('Update query:', updateQuery);
        console.log('Values:', values);
        
        const result = await pool.query(updateQuery, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Record with ID ${id} not found`
            });
        }
        
        res.json({
            success: true,
            message: 'Record updated successfully',
            data: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update record',
            details: error.message
        });
    }
});

// ============================================================================
// NEW ENDPOINT: Delete record from T_ABL_ORDNER
// ============================================================================
app.delete('/api/abl-ordner/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`Deleting T_ABL_ORDNER record with ID: ${id}`);
        
        const query = `
            DELETE FROM "COMPANY"."T_ABL_ORDNER"
            WHERE "PK_ABL_ORDNER" = $1
            RETURNING "PK_ABL_ORDNER", "ORDNER_NAME"
        `;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Record with ID ${id} not found`
            });
        }
        
        res.json({
            success: true,
            message: 'Record deleted successfully',
            deletedRecord: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error deleting record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete record',
            details: error.message
        });
    }
});



// Get related documents by FK_INP_BELEGE_ALL (checks both FK_INP_BELEGE_ALL1 and FK_INP_BELEGE_ALL2)
app.get("/belege/belege/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid document ID" });
        }

        const result = await pool.query(
            ` SELECT relinp.* ,
          inp1."PK_INP_BELEGE_ALL",
          inp1."BELEGNUMMER",
          inp1."BEZEICHNUNG",
          inp1."BRUTTO_BETRAG",
          inp1."BELEGDATUM",
          inp1."RECHNUNGSDATUM",
          inp2."PK_INP_BELEGE_ALL" inp2_PK_INP_BELEGE_ALL,
          inp2."BELEGNUMMER" inp2_BELEGNUMMER,
          inp2."BEZEICHNUNG" inp2_BEZEICHNUNG,
          inp2."BRUTTO_BETRAG" inp2_BRUTTO_BETRAG,
          inp2."BELEGDATUM" inp2_BELEGDATUM,
          inp2."RECHNUNGSDATUM" inp2_RECHNUNGSDATUM
          
   
             FROM "COMPANY"."T_REL_INP_INP_BELEGE_ALL_INP_BELEGE_ALL" relinp
               left join "COMPANY"."T_INP_BELEGE_ALL" inp1 on inp1."PK_INP_BELEGE_ALL" = relinp."FK_INP_BELEGE_ALL1" 
                left join "COMPANY"."T_INP_BELEGE_ALL" inp2 on inp2."PK_INP_BELEGE_ALL" = relinp."FK_INP_BELEGE_ALL2"
             WHERE "FK_INP_BELEGE_ALL1" = $1 OR "FK_INP_BELEGE_ALL2" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                message: "No related documents found",
                details: `No records found where FK_INP_BELEGE_ALL1 or FK_INP_BELEGE_ALL2 equals ${id}`
            });
        }

        res.json( result.rows
        );
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch related documents",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/accounts/1/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT "PK_REL_LEX_KTO_BEL",
                "FK_MAIN_KEY",
                "FK_INP_BELEGE_ALL",
                "FK_LEX_RELATION",
		"LINK_LEXOFFICE_BUCHUNG",
                "LEXOFFICE_REFERENZ_NR", 
                "FLG_LEXOFFICE_BUCHUNG",
                "FLG_LEXOFFICE_MIT_BILD"
             FROM "COMPANY"."T_REL_LEX_KTO_BEL" 
             WHERE "FK_MAIN_KEY" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get account(s) by FK_MAIN_KEY and/or FK_INP_BELEGE_ALL
app.get("/accounts/test23", async (req, res) => {
    try {
        const { FK_INP_BELEGE_ALL, FK_MAIN_KEY } = req.query;
        
        // Store parameters for error handling
        const requestParams = {
            FK_MAIN_KEY: FK_MAIN_KEY || 'not provided',
            FK_INP_BELEGE_ALL: FK_INP_BELEGE_ALL || 'not provided'
        };

        // Base query with joins
        let query = `
            SELECT 
                rel."PK_REL_LEX_KTO_BEL",
                rel."FK_MAIN_KEY",
                rel."FK_INP_BELEGE_ALL",
                rel."FK_LEX_RELATION",
                rel."LINK_LEXOFFICE_BUCHUNG",
                rel."FLG_LEXOFFICE_BUCHUNG",
                rel."FLG_LEXOFFICE_MIT_BILD",
                zus."BUCHUNGSTEXT",
                zus."BETRAG",
                to_char(zus."BUCHUNGSTAG",'DD.MM.YYYY') as "BUCHUNGSTAG",
                zus."FK_KTO_BANKKONTO",
                zus."FK_KON_OWNER1",
                zus."OWNER1",
                zus."BUCHT_JAHR",
                zus."TBL",
                zus."FK_KTO_KONTO_AUSZUG",
                inp."PK_INP_BELEGE_ALL",
                inp."BEZEICHNUNG",
                inp."BRUTTO_BETRAG",
                inp."FK_ABL_ORDNER_PAGE",
                inp."BELEGDATUM",
                zus."DATUM_ALL_OK",
                zus."DATUM_ZUORD_KTO_AUSZUG_OK",
                zus."FINAL_CNT_ZUORD_BELEGE"
            FROM "COMPANY"."T_REL_LEX_KTO_BEL" rel
            LEFT JOIN "COMPANY"."V_KTO_KONTEN_ZUS" zus ON rel."FK_MAIN_KEY" = zus."FK_MAIN_KEY"
            LEFT JOIN "COMPANY"."T_INP_BELEGE_ALL" inp ON rel."FK_INP_BELEGE_ALL" = inp."PK_INP_BELEGE_ALL"
            WHERE 1=1`;

        const params = [];
        
        // Add filters based on provided parameters
        if (FK_MAIN_KEY) {
            query += ` AND rel."FK_MAIN_KEY" =$${params.length + 1}`;
            params.push(FK_MAIN_KEY);
        }
        
        if (FK_INP_BELEGE_ALL) {
            query += ` AND rel."FK_INP_BELEGE_ALL" = $${params.length + 1}`;
            params.push(FK_INP_BELEGE_ALL);
        }

        // Add sorting for consistent results
        query += ` ORDER BY rel."FK_MAIN_KEY", rel."FK_INP_BELEGE_ALL"`;

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "No records found",
                parameters: requestParams
            });
        }

        res.json(
          
             result.rows
        );
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account data",
            parameters: {
                FK_MAIN_KEY: FK_MAIN_KEY || 'not provided',
                FK_INP_BELEGE_ALL: FK_INP_BELEGE_ALL || 'not provided'
            },
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack,
                query: error.query,
                parametersUsed: params || 'none'
            } : undefined
        });
    }
});

// Get account(s) by FK_MAIN_KEY from path parameter
app.get("/accounts/abc/:id", async (req, res) => {
    try {
        const { id } = req.params; // Changed from req.query to req.params
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ 
                error: "Invalid ID parameter - must be a number" 
            });
        }

        // Convert to number since we're using it in the query
        const fkMainKey = Number(id);

        // Base query with joins
        const result = await pool.query(`
            SELECT 
                rel."PK_REL_LEX_KTO_BEL",
                rel."FK_MAIN_KEY",
                rel."FK_INP_BELEGE_ALL",
                rel."FK_LEX_RELATION",
                rel."LEXOFFICE_REFERENZ_NR",
                rel."LINK_LEXOFFICE_BUCHUNG",
                rel."FLG_LEXOFFICE_BUCHUNG",
                rel."FLG_LEXOFFICE_MIT_BILD",
                zus."BUCHUNGSTEXT",
                zus."BETRAG",
                to_char(zus."BUCHUNGSTAG",'DD.MM.YYYY') as "BUCHUNGSTAG",
                zus."FK_KTO_BANKKONTO",
                zus."FK_KON_OWNER1",
                zus."OWNER1",
                zus."BUCHT_JAHR",
                zus."TBL",
                zus."FK_KTO_KONTO_AUSZUG",
                inp."PK_INP_BELEGE_ALL",
                inp."BEZEICHNUNG",
                inp."BRUTTO_BETRAG",
                inp."FK_ABL_ORDNER_PAGE",
                inp."BELEGDATUM",
                zus."DATUM_ALL_OK",
                zus."DATUM_ZUORD_KTO_AUSZUG_OK",
                zus."FINAL_CNT_ZUORD_BELEGE"
            FROM "COMPANY"."T_REL_LEX_KTO_BEL" rel
            LEFT JOIN "COMPANY"."V_KTO_KONTEN_ZUS" zus ON rel."FK_MAIN_KEY" = zus."FK_MAIN_KEY"
            LEFT JOIN "COMPANY"."T_INP_BELEGE_ALL" inp ON rel."FK_INP_BELEGE_ALL" = inp."PK_INP_BELEGE_ALL"
            WHERE rel."FK_MAIN_KEY" = $1`, 
            [fkMainKey]);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "No records found",
                parameters: {
                    FK_MAIN_KEY: id
                }
            });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account data",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});
// Get accounts with flexible AND filtering on multiple columns
app.get("/accounts/single", async (req, res) => {
    try {
        // Extrahiere Query-Parameter
        const { pk_rel_lex_kto_bel, fk_main_key, fk_inp_belege_all, fk_lex_relation, link_lexoffice_buchung } = req.query;

        // Baue die SQL-Abfrage dynamisch auf
        let query = `SELECT "PK_REL_LEX_KTO_BEL",
                            "FK_MAIN_KEY",
                            "FK_INP_BELEGE_ALL",
                            "FK_LEX_RELATION",
                            "LINK_LEXOFFICE_BUCHUNG"
                     FROM "COMPANY"."T_REL_LEX_KTO_BEL"
                     WHERE 1=1 `; // Basis, um flexibel weitere Bedingungen hinzuzufügen

        const params = [];
        let paramIndex = 1;

        // Füge Bedingungen nur hinzu, wenn Parameter existieren
        if (pk_rel_lex_kto_bel !== undefined) {
            query += ` AND "PK_REL_LEX_KTO_BEL" = $${paramIndex++}`;
            params.push(pk_rel_lex_kto_bel);
        }
        if (fk_main_key !== undefined) {
            query += ` AND "FK_MAIN_KEY" = $${paramIndex++}`;
            params.push(fk_main_key);
        }
        if (fk_inp_belege_all !== undefined) {
            query += ` AND "FK_INP_BELEGE_ALL" = $${paramIndex++}`;
            params.push(fk_inp_belege_all);
        }
        if (fk_lex_relation !== undefined) {
            query += ` AND "FK_LEX_RELATION" = $${paramIndex++}`;
            params.push(fk_lex_relation);
        }
        if (link_lexoffice_buchung !== undefined) {
            query += ` AND "LINK_LEXOFFICE_BUCHUNG" = $${paramIndex++}`;
            params.push(link_lexoffice_buchung);
        }

        // Führe die Abfrage aus
        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No matching account found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});
// Get all accounts
app.get("/accounts/bild/2/", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                        "PK_KTO_KONTO_AUSZUG",
			"IBAN"
                    FROM 
                        "COMPANY"."V_KTO_KONTO_AUSZUG_BILDER" 
		    group by  "PK_KTO_KONTO_AUSZUG",
				"IBAN"

                   ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Get single account by ID with proper field mapping
app.get("/accounts/bild/1/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
                *
             FROM "COMPANY"."V_KTO_KONTO_AUSZUG_BILDER" 
             WHERE "PK_KTO_KONTO_AUSZUG" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Get single account by ID with proper field mapping
app.get("/bild/basisdaten", async (req, res) => {
    try {
        const { id } = req.params;
        
     

   // Database query
        const result = await pool.query(
            `SELECT "PK_BILD_BILDER", "KLASSIFIKATION_1", "KLASSIFIKATION_2","KLASSIFIKATION_3","FINAL_KLASSIFIKATION", "FILENAME",
               "DATUM_ZUORD_OK", "FINAL_CNT_FK_INP_BELEGE_ALL", "FINAL_CNT_FK_KON_PERSON","FINAL_CNT_FK_INV_INVENTARE",  "FK_MEDIA_BUCH_BUCH", "FK_STD_BILD_BILDART", std."STD_NAME" as "FK_STD_BILD_BILDART_NAME"
             FROM "COMPANY"."T_BILD_BILDER" bild
           left join (select * from "COMPANY"."T_STD" where "FK_STD_GROUP" = 44) std on std."STD_VALUE"::double precision = bild."FK_STD_BILD_BILDART"

`
             
        );


        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/accounts/bild/1/1/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const cacheDir = path.join(__dirname, 'temp_cache');
        
        // Validate ID parameter
        if (!id || !/^\d+$/.test(id)) {
            return res.status(400).json({ 
                error: "Invalid account ID",
                details: "ID must be a positive integer"
            });
        }

        // Create cache directory if it doesn't exist
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        const cachePath = path.join(cacheDir, `image_${id}.cache`);

        // Check cache first
        if (fs.existsSync(cachePath)) {
            const cachedData = JSON.parse(fs.readFileSync(cachePath));
            const { FILECONTENT, FILENAME, KLASSIFIKATION_1, KLASSIFIKATION_2, lastUpdated,DATUM_ZUORD_OK, FINAL_CNT_FK_INP_BELEGE_ALL, FINAL_CNT_FK_KON_PERSON  } = cachedData;
            
            // Verify cache is fresh (e.g., 1 hour cache)
            if (Date.now() - lastUpdated < 3600000) {
                const isPDF = FILENAME.toLowerCase().endsWith('.pdf');
                
                // Prepare response data
                const response = {
                    file: {
                        content: Buffer.from(FILECONTENT),
                        filename: FILENAME,
                        contentType: isPDF ? 'application/pdf' : getContentType(FILENAME)
                        
                    },
                    metadata: {
                        klassifikation1: KLASSIFIKATION_1,
                        klassifikation2: KLASSIFIKATION_2,
                        datum_zuord_ok: DATUM_ZUORD_OK
                        
                    }
                };

                // Set headers and send response
                res.setHeader('Content-Type', 'application/json');
                return res.json(response);
            }
        }

        // Database query
        const result = await pool.query(
            `SELECT "FILECONTENT", "FILENAME", "KLASSIFIKATION_1", "KLASSIFIKATION_2",
               "DATUM_ZUORD_OK", "FINAL_CNT_FK_INP_BELEGE_ALL", "FINAL_CNT_FK_KON_PERSON"
             FROM "COMPANY"."T_BILD_BILDER" 
             WHERE "PK_BILD_BILDER" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "Image not found",
                details: `No image found with ID ${id}`
            });
        }

        const { FILECONTENT, FILENAME, KLASSIFIKATION_1, KLASSIFIKATION_2 } = result.rows[0];

        if (!FILECONTENT || !FILENAME) {
            return res.status(404).json({ 
                error: "Invalid image data",
                details: "File content or filename missing"
            });
        }

        // Update cache
        const cacheData = {
            FILECONTENT: Array.from(FILECONTENT),
            FILENAME,
            KLASSIFIKATION_1,
            KLASSIFIKATION_2,
            lastUpdated: Date.now()
        };
        fs.writeFileSync(cachePath, JSON.stringify(cacheData));

        // Prepare response data
        const isPDF = FILENAME.toLowerCase().endsWith('.pdf');
        const response = {
            file: {
                content: FILECONTENT,
                filename: FILENAME,

                contentType: isPDF ? 'application/pdf' : getContentType(FILENAME)
            },
            metadata: {
                klassifikation1: KLASSIFIKATION_1,
                klassifikation2: KLASSIFIKATION_2,
                datum_zuord_ok: DATUM_ZUORD_OK,
                final_cnt_fk_inp_belege_all: FINAL_CNT_FK_INP_BELEGE_ALL,
                final_cnt_fk_kon_person: FINAL_CNT_FK_KON_PERSON
            }
        };

        // Set headers
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache

        // Send response
        res.json(response);

    } catch (error) {
        console.error("Image retrieval error:", error);
        
        // Specific error for database issues
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                error: "Database unavailable",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

        res.status(500).json({ 
            error: "Image retrieval failed",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            requestId: req.id // If you have request ID tracking
        });
    }
});


app.get("/accounts/bild/1/1/1/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const cacheDir = path.join(__dirname, 'temp_cache');
        
        // Validate ID parameter
        if (!id || !/^\d+$/.test(id)) {
            return res.status(400).json({ 
                error: "Invalid account ID",
                details: "ID must be a positive integer"
            });
        }

        // Create cache directory if it doesn't exist
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        const cachePath = path.join(cacheDir, `image_${id}.cache`);

        // Check cache first
        if (fs.existsSync(cachePath)) {
            const cachedData = JSON.parse(fs.readFileSync(cachePath));
            const { FILECONTENT, FILENAME, lastUpdated } = cachedData;
            
            // Verify cache is fresh (e.g., 1 hour cache)
            if (Date.now() - lastUpdated < 3600000) {
                const isPDF = FILENAME.toLowerCase().endsWith('.pdf');
                res.setHeader('Content-Type', isPDF ? 'application/pdf' : getContentType(FILENAME));
                res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(FILENAME)}"`);
                return res.send(Buffer.from(FILECONTENT));
            }
        }

        // Database query
        const result = await pool.query(
            `SELECT "FILECONTENT", "FILENAME"
             FROM "COMPANY"."T_BILD_BILDER" 
             WHERE "PK_BILD_BILDER" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "Image not found",
                details: `No image found with ID ${id}`
            });
        }

        const { FILECONTENT, FILENAME} = result.rows[0];

        if (!FILECONTENT || !FILENAME) {
            return res.status(404).json({ 
                error: "Invalid image data",
                details: "File content or filename missing"
            });
        }

        // Update cache
        const cacheData = {
            FILECONTENT: Array.from(FILECONTENT),
            FILENAME,
            lastUpdated: Date.now()
        };
        fs.writeFileSync(cachePath, JSON.stringify(cacheData));

        // Set response headers
        const isPDF = FILENAME.toLowerCase().endsWith('.pdf');
        res.setHeader('Content-Type', isPDF ? 'application/pdf' : getContentType(FILENAME));
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(FILENAME)}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache


        // Send response
        res.send(FILECONTENT);

    } catch (error) {
        console.error("Image retrieval error:", error);
        
        // Specific error for database issues
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                error: "Database unavailable",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

        res.status(500).json({ 
            error: "Image retrieval failed",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
            requestId: req.id // If you have request ID tracking
        });
    }
});



// Helper function to determine content type from filename
function getContentType(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    const typeMap = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp'
    };
    return typeMap[extension] || 'application/octet-stream';
}


// Get all accounts
app.get("/ordner_pages", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
               vp.*, cnt, p.*

                    FROM 
                        "COMPANY"."V_ABL_ORDNER_PAGE" vp
   left join (select "FK_ABL_ORDNER_PAGE", count(*) cnt from "COMPANY"."T_INP_BELEGE_ALL" group by "FK_ABL_ORDNER_PAGE") cpg on cpg."FK_ABL_ORDNER_PAGE"  = vp."PK_ABL_ORDNER_PAGE"
join "COMPANY"."T_ABL_ORDNER_PAGE" p on p."PK_ABL_ORDNER_PAGE" = vp."PK_ABL_ORDNER_PAGE"
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Get all accounts
app.get("/wahlen", async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
               *

                    FROM 
                        "COMPANY"."T_WAHL_WAHL" 
                    ;`
        );
        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all accounts for a specific year
app.get("/ordner_pages/:jahr", async (req, res) => {
    try {
        const { jahr } = req.params;

        // Validate year parameter
        if (!jahr || isNaN(jahr) || jahr.length !== 4) {
            return res.status(400).json({ 
                error: "Invalid year parameter",
                message: "Please provide a valid 4-digit year"
            });
        }

        const result = await pool.query(
            `SELECT vp.* , cpg.cnt
             FROM "COMPANY"."V_ABL_ORDNER_PAGE" vp
                left join (select "FK_ABL_ORDNER_PAGE", count(*) cnt from "COMPANY"."T_INP_BELEGE_ALL" group by "FK_ABL_ORDNER_PAGE") cpg on cpg."FK_ABL_ORDNER_PAGE"  = vp."PK_ABL_ORDNER_PAGE"
             WHERE "JAHR" = $1`,
            [jahr]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                message: "No records found for the specified year",
                year: jahr
            });
        }

        res.json({
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch accounts",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.get("/belege/select", async (req, res) => {
    try {
        const {
            FK_ABL_ORDNER_PAGE,
            FK_INV_INVENTAR,
            FK_VER_VERTRAG,
            FK_KON_PERSON,
            FK_ADR_LAND,
            FK_ADR_ORT,
            FK_LOC_LOCATION
        } = req.query;

        // Check if at least one valid parameter is provided
        const filters = [];
        const values = [];
        let paramIndex = 1;

        if (FK_ABL_ORDNER_PAGE && !isNaN(FK_ABL_ORDNER_PAGE)) {
            filters.push(`"FK_ABL_ORDNER_PAGE" = $${paramIndex}`);
            values.push(FK_ABL_ORDNER_PAGE);
            paramIndex++;
        }

        if (FK_INV_INVENTAR && !isNaN(FK_INV_INVENTAR)) {
            filters.push(`"FK_INV_INVENTAR" = $${paramIndex}`);
            values.push(FK_INV_INVENTAR);
            paramIndex++;
        }

        if (FK_VER_VERTRAG && !isNaN(FK_VER_VERTRAG)) {
            filters.push(`"FK_VER_VERTRAG" = $${paramIndex}`);
            values.push(FK_VER_VERTRAG);
            paramIndex++;
        }

        if (FK_KON_PERSON && !isNaN(FK_KON_PERSON)) {
            filters.push(`"FK_KON_PERSON" = $${paramIndex}`);
            values.push(FK_KON_PERSON);
            paramIndex++;
        }

        if (FK_ADR_LAND && !isNaN(FK_ADR_LAND)) {
            filters.push(`"FK_ADR_LAND" = $${paramIndex}`);
            values.push(FK_ADR_LAND);
            paramIndex++;
        }

        if (FK_ADR_ORT && !isNaN(FK_ADR_ORT)) {
            filters.push(`"FK_ADR_ORT" = $${paramIndex}`);
            values.push(FK_ADR_ORT);
            paramIndex++;
        }

        if (FK_LOC_LOCATION && !isNaN(FK_LOC_LOCATION)) {
            filters.push(`"FK_LOC_LOCATION" = $${paramIndex}`);
            values.push(FK_LOC_LOCATION);
            paramIndex++;
        }

        // If no valid parameters provided
        if (filters.length === 0) {
            return res.status(400).json({ 
                error: "Invalid request. Please provide at least one valid filter parameter.",
                validParameters: [
                    "FK_ABL_ORDNER_PAGE",
                    "FK_INV_INVENTAR",
                    "FK_VER_VERTRAG",
                    "FK_KON_PERSON",
                    "FK_ADR_LAND",
                    "FK_ADR_ORT",
                    "FK_LOC_LOCATION"
                ]
            });
        }

        // Build the WHERE clause
        const whereClause = filters.join(" OR ");
        
        const query = `
            SELECT * 
            FROM "COMPANY"."T_INP_BELEGE_ALL" 
            WHERE ${whereClause}
            ORDER BY "PK_INP_BELEGE_ALL" DESC
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "No records found",
                filtersApplied: filters,
                parametersProvided: req.query
            });
        }

        res.json({
            count: result.rows.length,
            filters: filters,
            data: result.rows
        });
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch records",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});


// Get single account by ID with proper field mapping
app.get("/belege/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
                *
             FROM "COMPANY"."T_INP_BELEGE_ALL" 
             WHERE "FK_ABL_ORDNER_PAGE" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});




// Get single account by ID with proper field mapping
app.get("/beleg/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
                inp.*,
                vinp."ABL_ORD_J_PAGE_NUMBER",
     vinp."ABL_ORD_PK_ABL_ORDNER_PAGE",
     vinp."ABL_ORD_PAGE_NUMBER",
    vinp."ABL_ORD_JAHR",
     vinp."ABL_ORD_ORDNER_NAME",
     vinp."ABL_ORD_PK_ABL_ORDNER",
     vinp."ABL_ORD_PAGE_DESCR",
vinp."KTOKAT_KATEGORIE",
vinp."VBEL_VERWENDUNGSZWECK",
vinp."VLOC_LOCATION",
vinp."VLOC_PK_LOC_LOCATION",
vinp."VBEL_FK_INV_INVENTAR",
vinp."INVENTAR",
vinp."VBEL_PROJEKT",
vinp."VBEL_KATEGORIE",
vinp."ADR_ADRESSE_SCHNELL",
vinp."VBEL_VERWENDUNGSZWECK",
vinp."ORG_UNIT_NAME",
vinp."GESCHAEFTSPARTNER",
vinp."VER_BEZEICHNUNG",
vinp."ADRESSE",
vinp."LAND",
vinp."ORT",
vinp."CI_LAND",
vinp.person,
vinp."VERWENDUNGSZWECK"
             FROM "COMPANY"."T_INP_BELEGE_ALL" inp
             left join "COMPANY"."V_INP_BELEGE_ALL" vinp on vinp."PK_INP_BELEGE_ALL" = inp."PK_INP_BELEGE_ALL"
             WHERE inp."PK_INP_BELEGE_ALL" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get all records from a specified table in COMPANY schema
app.get("/table/:name", async (req, res) => {
    try {
        const { name } = req.params;

        // Validate table name to prevent SQL injection
        if (!name || !/^[a-zA-Z0-9_]+$/.test(name)) {
            return res.status(400).json({ error: "Invalid table name" });
        }

        // Safely construct the query using parameterized table name
        const query = `SELECT * FROM "COMPANY"."${name}"`;
        
        const result = await pool.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                message: "No records found",
                table: name
            });
        }

        res.json({
            table: name,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error(`Database error querying table ${req.params.name}:`, error.message);
        
        // Handle "relation does not exist" error specifically
        if (error.message.includes('does not exist')) {
            return res.status(404).json({ 
                error: "Table not found",
                table: req.params.name,
                schema: "COMPANY"
            });
        }

        res.status(500).json({ 
            error: "Failed to fetch table data",
            table: req.params.name,
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/belege_pos/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
                *
             FROM "COMPANY"."T_INP_BELEGE_POS_ALL" 
             WHERE "FK_INP_BELEGE_ALL" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.post("/std_group/insert", async (req, res) => {
    try {
        const {
            stdGroupName,
            tableName,
            colName,
            comm,
            valid,
            validFrom,
            validTo,
            createdBy,
            stdGroupNameEng,
            fkMandant
        } = req.body;

        // Validate required fields
        if (!stdGroupName) {
            return res.status(400).json({
                success: false,
                error: "STD_GROUP_NAME is required"
            });
        }

        const currentTimestamp = new Date();
        const defaultCreatedBy = createdBy || 'system';
        const defaultFkMandant = fkMandant || 1;
        const defaultValid = valid !== undefined ? valid : true;

        const result = await pool.query(
            `INSERT INTO "COMPANY"."T_STD_GROUP" (
                "STD_GROUP_NAME",
                "TABLE_NAME",
                "COL_NAME",
                "COMM",
                "VALID",
                "VALID_FROM",
                "VALID_TO",
                "CREATED_BY",
                "CREATED_AT",
                "MODIFIED_BY",
                "MODIFIED_AT",
                "STD_GROUP_NAME_ENG",
                "FK_MDT_MANDANT"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING "PK_STD_GROUP"`,
            [
                stdGroupName,
                tableName || null,
                colName || null,
                comm || null,
                defaultValid,
                validFrom || currentTimestamp,
                validTo || null,
                defaultCreatedBy,
                currentTimestamp,
                defaultCreatedBy,
                currentTimestamp,
                stdGroupNameEng || null,
                defaultFkMandant
            ]
        );

        res.status(201).json({
            success: true,
            groupRecordId: result.rows[0].PK_STD_GROUP,
            message: "Student group created successfully"
        });

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to insert student group",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.put("/std_group/update/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            stdGroupName,
            tableName,
            colName,
            comm,
            valid,
            validFrom,
            validTo,
            modifiedBy,
            stdGroupNameEng,
            fkMandant
        } = req.body;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Group ID is required"
            });
        }

        // Check if record exists
        const checkResult = await pool.query(
            `SELECT "PK_STD_GROUP" FROM "COMPANY"."T_STD_GROUP" WHERE "PK_STD_GROUP" = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Student group not found"
            });
        }

        // Build dynamic update query
        let updateFields = [];
        let queryParams = [];
        let paramCount = 1;

        updateFields.push(`"MODIFIED_AT" = $${paramCount}`);
        queryParams.push(new Date());
        paramCount++;

        updateFields.push(`"MODIFIED_BY" = $${paramCount}`);
        queryParams.push(modifiedBy || 'system');
        paramCount++;

        if (stdGroupName !== undefined) {
            updateFields.push(`"STD_GROUP_NAME" = $${paramCount}`);
            queryParams.push(stdGroupName);
            paramCount++;
        }

        if (tableName !== undefined) {
            updateFields.push(`"TABLE_NAME" = $${paramCount}`);
            queryParams.push(tableName);
            paramCount++;
        }

        if (colName !== undefined) {
            updateFields.push(`"COL_NAME" = $${paramCount}`);
            queryParams.push(colName);
            paramCount++;
        }

        if (comm !== undefined) {
            updateFields.push(`"COMM" = $${paramCount}`);
            queryParams.push(comm);
            paramCount++;
        }

        if (valid !== undefined) {
            updateFields.push(`"VALID" = $${paramCount}`);
            queryParams.push(valid);
            paramCount++;
        }

        if (validFrom !== undefined) {
            updateFields.push(`"VALID_FROM" = $${paramCount}`);
            queryParams.push(validFrom);
            paramCount++;
        }

        if (validTo !== undefined) {
            updateFields.push(`"VALID_TO" = $${paramCount}`);
            queryParams.push(validTo);
            paramCount++;
        }

        if (stdGroupNameEng !== undefined) {
            updateFields.push(`"STD_GROUP_NAME_ENG" = $${paramCount}`);
            queryParams.push(stdGroupNameEng);
            paramCount++;
        }

        if (fkMandant !== undefined) {
            updateFields.push(`"FK_MDT_MANDANT" = $${paramCount}`);
            queryParams.push(fkMandant);
            paramCount++;
        }

        if (updateFields.length <= 2) {
            return res.status(400).json({
                success: false,
                error: "No fields to update"
            });
        }

        queryParams.push(id);

        const updateQuery = `
            UPDATE "COMPANY"."T_STD_GROUP" 
            SET ${updateFields.join(', ')}
            WHERE "PK_STD_GROUP" = $${paramCount}
            RETURNING "PK_STD_GROUP", "STD_GROUP_NAME", "MODIFIED_AT"
        `;

        const result = await pool.query(updateQuery, queryParams);

        res.json({
            success: true,
            message: "Student group updated successfully",
            updatedRecord: result.rows[0]
        });

    } catch (error) {
        console.error("Database error during update:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to update student group",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.delete("/std_group/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Group ID is required"
            });
        }

        // Check if record exists
        const checkResult = await pool.query(
            `SELECT "PK_STD_GROUP", "STD_GROUP_NAME" FROM "COMPANY"."T_STD_GROUP" WHERE "PK_STD_GROUP" = $1`,
            [id]
        );

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Student group not found"
            });
        }

        // Check if group has students
        const studentsCheck = await pool.query(
            `SELECT COUNT(*) as student_count FROM "COMPANY"."T_STD" WHERE "FK_STD_GROUP" = $1`,
            [id]
        );

        if (parseInt(studentsCheck.rows[0].student_count) > 0) {
            return res.status(400).json({
                success: false,
                error: "Cannot delete group that has students. Please delete or move students first."
            });
        }

        // Delete the group
        const deleteResult = await pool.query(
            `DELETE FROM "COMPANY"."T_STD_GROUP" WHERE "PK_STD_GROUP" = $1 RETURNING "PK_STD_GROUP", "STD_GROUP_NAME"`,
            [id]
        );

        res.json({
            success: true,
            message: "Student group deleted successfully",
            deletedRecord: deleteResult.rows[0]
        });

    } catch (error) {
        console.error("Database error during deletion:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to delete student group",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.get("/std_group/single/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                error: "Group ID is required"
            });
        }

        const result = await pool.query(
            `SELECT * FROM "COMPANY"."T_STD_GROUP" WHERE "PK_STD_GROUP" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Student group not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to fetch student group",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.get("/rel_person_bild/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
                bild.*
             FROM "COMPANY"."T_REL_KON_PERSON_BILD" relperbild 
    
LEFT JOIN "COMPANY"."T_BILD_BILDER" bild 
    ON bild."PK_BILD_BILDER"::double precision = relperbild."FK_BILD_BILDER"
             WHERE "FK_KON_PERSON" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/beleg/bild/1/", async (req, res) => {
    try {
        const { pk_inp, pk_bild } = req.query;
        
        // Build the query based on which parameters are provided
        let query = `
            SELECT 
                relinp.*, bild."PK_BILD_BILDER", bild."FILECONTENT", bild."FILENAME", 
                bild."KLASSIFIKATION_1", bild."DATUM_ZUORD_OK", 
                bild."FINAL_CNT_FK_INP_BELEGE_ALL", bild."FINAL_CNT_FK_KON_PERSON", 
                bild."FINAL_CNT_FK_INV_INVENTARE",
               inp."FK_KON_ORG_UNIT", inp."FK_KON_PERSON", inp."FK_LOC_LOCATION", inp."PERSON", inp."ORG_UNIT_NAME",
inp."VLOC_LOCATION", inp."VLOC_LOCATION_TYPE",
    inp."VLOC_STRASSE",
    inp."VLOC_HSNR",
    inp."VLOC_BESCHREIBUNG",
    inp."VLOC_COMM",
   inp."VLOC_POSTFACH",
    inp."VLOC_PLZ",
    inp."VLOC_ORT",
   inp."VLOC_LAND",
inp."BEZEICHNUNG"
            FROM "COMPANY"."T_REL_INP_INP_BELEGE_ALL_BILD_BILDER" relinp
            LEFT JOIN "COMPANY"."T_BILD_BILDER" bild ON relinp."FK_BILD_BILDER" = bild."PK_BILD_BILDER"
            left join "COMPANY"."V_INP_BELEGE_ALL" inp on  inp."PK_INP_BELEGE_ALL" = relinp."FK_INP_BELEGE_ALL"
            WHERE 1=1
        `;
        
        const params = [];
        
        if (pk_inp && pk_inp !== '0') {
            query += ` AND relinp."FK_INP_BELEGE_ALL" = $${params.length + 1}`;
            params.push(pk_inp);
        }
        
        if (pk_bild && pk_bild !== '0') {
            query += ` AND "FK_BILD_BILDER" = $${params.length + 1}`;
            params.push(pk_bild);
        }
        
        // If no parameters provided, return all records
        if (params.length === 0) {
            query += ` LIMIT 100`; // Limit results if no filter
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "No records found",
                message: "No matching input belege or bilder found with the provided criteria"
            });
        }

        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
        
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch records",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/projekt/bild/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
                proj.*, bild."PK_BILD_BILDER",bild."FILECONTENT", bild."FILENAME", bild."KLASSIFIKATION_1", bild."DATUM_ZUORD_OK", bild."FINAL_CNT_FK_INP_BELEGE_ALL", bild."FINAL_CNT_FK_KON_PERSON", bild."FINAL_CNT_FK_INV_INVENTARE"
             FROM "COMPANY"."T_REL_PROJ_PROJEKT_ALL_BILD_BILDER" inp
                 left join "COMPANY"."T_BILD_BILDER" bild on inp."FK_BILD_BILDER" = bild."PK_BILD_BILDER"
             WHERE "FK_PROJ_PROJEKT" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/beleg/bild1/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        // First try to get data with relationships
        const relationshipQuery = await pool.query(
            `SELECT 
                relinp.*, bild."PK_BILD_BILDER", bild."FILECONTENT", bild."FILENAME", bild."KLASSIFIKATION_1", bild."COMM", 
                inp."PK_INP_BELEGE_ALL", inp."BEZEICHNUNG", inp."BELEGDATUM", inp."BRUTTO_BETRAG", inp."FK_MEDIA_BUCH_BUCH", 
                ord."PK_ABL_ORDNER_PAGE", ord."ORDNER_NAME", ord."ORDNER_PAGE",
                bild."DATUM_ZUORD_OK", bild."FINAL_CNT_FK_INP_BELEGE_ALL", bild."FINAL_CNT_FK_KON_PERSON", inp."DATUM_ALL_OK",  bild."KLASSIFIKATION_2", bild."KLASSIFIKATION_3", std."STD_VALUE", std."STD_NAME" "FK_STD_BILD_BILDART_NAME"
             FROM "COMPANY"."T_REL_INP_INP_BELEGE_ALL_BILD_BILDER" relinp
                 left join "COMPANY"."T_BILD_BILDER" bild on relinp."FK_BILD_BILDER" = bild."PK_BILD_BILDER"
                 left join "COMPANY"."T_INP_BELEGE_ALL" inp on inp."PK_INP_BELEGE_ALL" = relinp."FK_INP_BELEGE_ALL"
                 left join "COMPANY"."V_ABL_ORDNER_PAGE" ord on ord."PK_ABL_ORDNER_PAGE" = inp."FK_ABL_ORDNER_PAGE"
  left join (select * from "COMPANY"."T_STD" where "FK_STD_GROUP" = 44) std on std."STD_VALUE"::double precision = bild."FK_STD_BILD_BILDART"
             WHERE "FK_BILD_BILDER" = $1`,
            [id]
        );

        if (relationshipQuery.rows.length > 0) {
            return res.json(relationshipQuery.rows);
        }

        // If no results in relationship table, try to get just the image data
        const imageQuery = await pool.query(
            `SELECT bild.*, std."STD_VALUE", std."STD_NAME" "FK_STD_BILD_BILDART_NAME" FROM "COMPANY"."T_BILD_BILDER" bild
  left join (select * from "COMPANY"."T_STD" where "FK_STD_GROUP" = 44) std on std."STD_VALUE"::double precision = bild."FK_STD_BILD_BILDART"
WHERE "PK_BILD_BILDER" = $1`,
            [id]
        );

        if (imageQuery.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(imageQuery.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get beleg/bild by either FK_INP_BELEGE_ALL or FK_BILD_BILDER
app.get("/beleg/bild1", async (req, res) => {
    try {
        const { fk_inp_belege_all, fk_bild_bilder } = req.query;
        
        // Validate at least one parameter is provided
        if (!fk_inp_belege_all && !fk_bild_bilder) {
            return res.status(400).json({ 
                error: "Must provide either FK_INP_BELEGE_ALL or FK_BILD_BILDER parameter",
                example_usage: [
                    "/beleg/bild?fk_inp_belege_all=123",
                    "/beleg/bild?fk_bild_bilder=456",
                    "/beleg/bild?fk_inp_belege_all=123&fk_bild_bilder=456"
                ]
            });
        }

        // Validate parameters are numbers if provided
        if (fk_inp_belege_all && isNaN(fk_inp_belege_all)) {
            return res.status(400).json({ 
                error: "Invalid FK_INP_BELEGE_ALL value",
                received: fk_inp_belege_all
            });
        }
        if (fk_bild_bilder && isNaN(fk_bild_bilder)) {
            return res.status(400).json({ 
                error: "Invalid FK_BILD_BILDER value",
                received: fk_bild_bilder
            });
        }

        // Build query dynamically based on provided parameters
        let query = `
            SELECT 
                inp.*, 
                bild."PK_BILD_BILDER",
                bild."FILECONTENT", 
                bild."FILENAME", 
                bild."KLASSIFIKATION_1",
bild."KLASSIFIKATION_2",
bild."KLASSIFIKATION_3"

            FROM "COMPANY"."T_REL_INP_INP_BELEGE_ALL_BILD_BILDER" inp
            LEFT JOIN "COMPANY"."T_BILD_BILDER" bild 
                ON inp."FK_BILD_BILDER" = bild."PK_BILD_BILDER"
            WHERE 1=1 `;

        const params = [];
        
        if (fk_inp_belege_all && fk_bild_bilder) {
            query += ` AND ("FK_INP_BELEGE_ALL" = $1 OR "FK_BILD_BILDER" = $2)`;
            params.push(fk_inp_belege_all, fk_bild_bilder);
        } else if (fk_inp_belege_all) {
            query += `"AND FK_INP_BELEGE_ALL" = $1`;
            params.push(fk_inp_belege_all);
        } else {
            query += `"AND FK_BILD_BILDER" = $1`;
            params.push(fk_bild_bilder);
        }

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: "No records found",
                parameters_used: {
                    fk_inp_belege_all,
                    fk_bild_bilder
                }
            });
        }

        res.json({
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch records",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack,
                query: error.query
            } : undefined
        });
    }
});


app.get("/related-documents/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid document ID" });
        }

        // Convert to number to prevent SQL injection
        const documentId = Number(id);

        const queryText = `
            SELECT 
                relinp.*,
                inp1."PK_INP_BELEGE_ALL" AS inp1_pk,
                inp1."BELEGNUMMER" AS inp1_belegnummer,
                inp1."BEZEICHNUNG" AS inp1_bezeichnung,
                inp1."BELEGDATUM" AS inp1_belegdatum,
                inp1."BRUTTO_BETRAG" AS inp1_bruttobetrag,
                inp2."PK_INP_BELEGE_ALL" AS inp2_pk,
                inp2."BELEGNUMMER" AS inp2_belegnummer,
                inp2."BEZEICHNUNG" AS inp2_bezeichnung,
                inp2."BELEGDATUM" AS inp2_belegdatum,
                inp2."BRUTTO_BETRAG" AS inp2_bruttobetrag
            FROM "COMPANY"."T_REL_INP_INP_BELEGE_ALL_INP_BELEGE_ALL" relinp
            LEFT JOIN "COMPANY"."T_INP_BELEGE_ALL" inp1 
                ON inp1."PK_INP_BELEGE_ALL" = relinp."FK_INP_BELEGE_ALL1"
            LEFT JOIN "COMPANY"."T_INP_BELEGE_ALL" inp2 
                ON inp2."PK_INP_BELEGE_ALL" = relinp."FK_INP_BELEGE_ALL2"
            WHERE relinp."FK_INP_BELEGE_ALL1" = $1 
               OR relinp."FK_INP_BELEGE_ALL2" = $1`;

        const result = await pool.query(queryText, [documentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No related documents found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch related documents",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});

app.get("/pos-related-documents/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid document ID" });
        }

        // Convert to number to prevent SQL injection
        const documentId = id;

        const queryText = `
            SELECT 
                pos."FK_INP_BELEGE_ALL",
                pos."POSITION",
                pos."BELEGNUMMER",
                pos."BELEGDATUM",
                pos."BEZEICHNUNG",
                pos."NETTO_BETRAG",
                pos."BRUTTO_BETRAG",
                pos."FK_INP_BELEGE_ALL_RELATED",
                inp1."PK_INP_BELEGE_ALL" AS inp1_pk,
                inp1."BELEGNUMMER" AS inp1_belegnummer,
                inp1."BEZEICHNUNG" AS inp1_bezeichnung,
                inp1."BELEGDATUM" AS inp1_belegdatum,
                inp1."BRUTTO_BETRAG" AS inp1_bruttobetrag,
                inp2."PK_INP_BELEGE_ALL" AS inp2_pk,
                inp2."BELEGNUMMER" AS inp2_belegnummer,
                inp2."BEZEICHNUNG" AS inp2_bezeichnung,
                inp2."BELEGDATUM" AS inp2_belegdatum,
                inp2."BRUTTO_BETRAG" AS inp2_bruttobetrag
            FROM "COMPANY"."T_INP_BELEGE_POS_ALL" pos
            LEFT JOIN "COMPANY"."T_INP_BELEGE_ALL" inp1 
                ON inp1."PK_INP_BELEGE_ALL"::text = pos."FK_INP_BELEGE_ALL"
            LEFT JOIN "COMPANY"."T_INP_BELEGE_ALL" inp2 
                ON inp2."PK_INP_BELEGE_ALL" = pos."FK_INP_BELEGE_ALL_RELATED"
            WHERE pos."FK_INP_BELEGE_ALL"::text =$1::text
               `;

        const result = await pool.query(queryText, [documentId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No related documents found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch related documents",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack
            } : undefined
        });
    }
});


// Get single account by ID with proper field mapping
app.get("/giro/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
                *
             FROM "COMPANY"."T_KTO_GIROKONTO" 
             WHERE "FK_MAIN_KEY" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/kredit/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
                *
             FROM "COMPANY"."T_KTO_KREDITKARTE" 
             WHERE "FK_MAIN_KEY" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/paypal/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
                *
             FROM "COMPANY"."T_KTO_PAYPAL" 
             WHERE "FK_MAIN_KEY" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/paypal_gr/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
                *
             FROM "COMPANY"."T_KTO_PAYPAL_GUTHABEN_RELEVANT" 
             WHERE "FK_MAIN_KEY" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/person/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
                *
             FROM "COMPANY"."T_KON_PERSON" 
             WHERE "FK_KON_PERSON" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/inp_belege_tree/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
                *
             FROM "COMPANY"."V_INP_BELEGE_TREE2_1" 
             WHERE "PK_INP_BELEGE_ALL" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

// Get single account by ID with proper field mapping
app.get("/paypal_abgeschl/:id", async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate ID parameter
        if (!id || isNaN(id)) {
            return res.status(400).json({ error: "Invalid account ID" });
        }

        const result = await pool.query(
            `SELECT 
                *
             FROM "COMPANY"."T_KTO_PAYPAL_ABGESCHLOSSENE_ZAHLUNGEN" 
             WHERE "FK_MAIN_KEY" = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Account not found" });
        }

        res.json(result.rows);
    } catch (error) {
        console.error("Database error:", error.message);
        res.status(500).json({ 
            error: "Failed to fetch account",
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
});

app.get("/wahl_kandidaten_berufe/select_kand/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * 
       FROM "COMPANY"."V_WAHL_KANDIDATEN_BERUF"
       WHERE "PK_WAHL_KANDIDATEN" = $1`,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// GET by FK_KON_PERSON
app.get("/wahl_kandidaten_berufe/select_person/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * 
       FROM "COMPANY"."V_WAHL_KANDIDATEN_BERUF"
       WHERE "FK_KON_PERSON" = $1`,
      [id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});


// Web Service für die Prozedur-Ausführung
app.post("/procedure/execute_p_inp_add_inp_belege_all_from_zus_1", async (req, res) => {
    try {
        const { p_fk_abl_ordner_page, p_fk_main_key } = req.body;

        // Validierung der Eingabeparameter
        if (!p_fk_abl_ordner_page || !p_fk_main_key) {
            return res.status(400).json({
                success: false,
                error: "Beide Parameter sind erforderlich",
                parameters: {
                    p_fk_abl_ordner_page: "Ordner Page ID (bigint)",
                    p_fk_main_key: "Main Key ID (bigint)"
                }
            });
        }

        console.log(`Executing procedure P_INP_ADD_INP_BELEGE_ALL_FROM_ZUS_1 with params:`, {
            p_fk_abl_ordner_page,
            p_fk_main_key
        });

        // PostgreSQL Prozedur-Aufruf
        const result = await pool.query(
            `CALL "COMPANY"."P_INP_ADD_INP_BELEGE_ALL_FROM_ZUS_1"($1, $2)`,
            [p_fk_abl_ordner_page, p_fk_main_key]
        );

        res.status(200).json({
            success: true,
            message: "Prozedur erfolgreich ausgeführt",
            procedure: "P_INP_ADD_INP_BELEGE_ALL_FROM_ZUS_1",
            parameters: {
                p_fk_abl_ordner_page: parseInt(p_fk_abl_ordner_page),
                p_fk_main_key: parseInt(p_fk_main_key)
            },
            result: "Daten erfolgreich in T_INP_BELEGE_ALL eingefügt",
            details: {
                sourceView: "V_KTO_KONTEN_ZUS",
                targetTable: "T_INP_BELEGE_ALL",
                insertedFields: [
                    "FK_BAS_KAT_KATEGORIE",
                    "FK_BAS_KAL_ARBEITSTAG", 
                    "FK_KTO_BUCHUNG",
                    "FK_STD_VERW_VERWENDUNGSZWECK",
                    "FK_LOC_LOCATION",
                    "BEZEICHNUNG",
                    "BELEGDATUM",
                    "BRUTTO_BETRAG",
                    "COMM_SONSTIGES",
                    "BELEG_UHRZEIT",
                    "BRUTTO_BETRAG_INCL_TRINKG",
                    "FRMDW_BRUTTO_BETRAG",
                    "FRMDW_BRUTTO_INCL_TRINKG",
                    "EUR_BRUTTO_BETRAG",
                    "EUR_BRUTTO_INCL_TRINKG",
                    "FK_STD_INP_STATUS",
                    "FK_ABL_ORDNER_PAGE"
                ]
            }
        });

    } catch (error) {
        console.error("Procedure execution error:", error.message);
        
        res.status(500).json({
            success: false,
            error: "Fehler bei der Prozedur-Ausführung",
            procedure: "P_INP_ADD_INP_BELEGE_ALL_FROM_ZUS_1",
            details: process.env.NODE_ENV === "development" ? {
                message: error.message,
                stack: error.stack,
                sqlState: error.code
            } : undefined,
            troubleshooting: {
                note: "Stellen Sie sicher, dass die View V_KTO_KONTEN_ZUS und die Tabellen T_KTO_GIROKONTO/T_KTO_KREDITKARTE existieren",
                requiredPermissions: "EXECUTE auf die Prozedur und SELECT auf die beteiligten Tabellen/Views"
            }
        });
    }
});

module.exports = app;


// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});