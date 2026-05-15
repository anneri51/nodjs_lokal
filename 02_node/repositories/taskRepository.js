const db = require("../db"); // pg Pool

module.exports = {
  async getAll() {
    const sql = `SELECT * FROM "COMPANY"."T_TSK_TASK" ORDER BY "PK_TSK_TASK"`;
    const { rows } = await db.query(sql);
    return rows;
  },

  async getById(id) {
    const sql = `SELECT * FROM "COMPANY"."T_TSK_TASK" WHERE "PK_TSK_TASK" = $1`;
    const { rows } = await db.query(sql, [id]);
    return rows[0];
  },

  async create(data) {
    const sql = `
      INSERT INTO "COMPANY"."T_TSK_TASK" (
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
      RETURNING *;
    `;

    const params = [
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
    ];

    const { rows } = await db.query(sql, params);
    return rows[0];
  },

  async update(id, data) {
    const sql = `
      UPDATE "COMPANY"."T_TSK_TASK"
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
      RETURNING *;
    `;

    const params = [
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
      id
    ];

    const { rows } = await db.query(sql, params);
    return rows[0];
  },

  async remove(id) {
    const sql = `DELETE FROM "COMPANY"."T_TSK_TASK" WHERE "PK_TSK_TASK" = $1`;
    await db.query(sql, [id]);
    return { deleted: true };
  }
};
