import type { QueryResultRow } from "pg";
import {
    appSettingFromRow,
    type AppSettingRow,
    districtFromRow,
    type DistrictRow,
    type InstituteTypeByParticipantCategoryRow,
    instituteTypeFromRow,
    type InstituteTypeRow,
    instituteTypesByParticipantCategoryFromRows,
    listItemFromRow,
    type NamedRow,
    participantCategoryFromRow,
    participantCategoryInstituteTypeFromRow,
    type ParticipantCategoryInstituteTypeRow,
    type ParticipantCategoryRow,
} from "./common.model.js";

export type DatabaseClient = {
    query<T extends QueryResultRow = QueryResultRow>(
        text: string,
        values?: readonly unknown[],
    ): Promise<{ rows: T[] }>;
};

export type DistrictFilters = {
    stateId?: number;
};

function districtWhereClause(filters: DistrictFilters) {
    const conditions: string[] = ["d.is_active = TRUE", "s.is_active = TRUE"];
    const values: number[] = [];

    if (filters.stateId !== undefined) {
        values.push(filters.stateId);
        conditions.push(`d.state_id = $${values.length}`);
    }

    return {
        sql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
        values,
    };
}

async function getStates(pg: DatabaseClient) {
    const result = await pg.query<NamedRow>(`
    SELECT id, name_en, name_bn, name_hi
    FROM states
    WHERE is_active = TRUE
    ORDER BY name_en
  `);

    return result.rows.map(listItemFromRow);
}

async function getAppSettings(pg: DatabaseClient) {
    const result = await pg.query<AppSettingRow>(`
    SELECT
      setting_key,
      setting_value,
      setting_type,
      description,
      is_active,
      updated_at
    FROM app_settings
    WHERE is_active = TRUE
    ORDER BY setting_key
  `);

    return result.rows.map(appSettingFromRow);
}

async function getDistricts(pg: DatabaseClient, filters: DistrictFilters = {}) {
    const where = districtWhereClause(filters);
    const result = await pg.query<DistrictRow>(
        `
      SELECT
        d.id,
        d.state_id,
        d.name_en,
        d.name_bn,
        d.name_hi,
        s.name_en AS state_name_en,
        s.name_bn AS state_name_bn,
        s.name_hi AS state_name_hi
      FROM districts d
      JOIN states s ON s.id = d.state_id
      ${where.sql}
      ORDER BY s.name_en, d.name_en
    `,
        where.values,
    );

    return result.rows.map(districtFromRow);
}

async function getParticipantCategories(pg: DatabaseClient) {
    const result = await pg.query<ParticipantCategoryRow>(`
    SELECT id, code, name_en, name_bn, name_hi, sort_order
    FROM participant_categories
    WHERE is_active = TRUE
    ORDER BY sort_order, name_en
  `);

    return result.rows.map(participantCategoryFromRow);
}

async function getInstituteTypes(pg: DatabaseClient, participantCategory = "") {
    const values = participantCategory ? [participantCategory] : [];
    const result = await pg.query<InstituteTypeRow>(
        `
      SELECT
        it.id,
        it.name_en,
        it.name_bn,
        it.name_hi,
        it.sort_order,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(pc.code ORDER BY pc.sort_order), NULL),
          '{}'
        ) AS participant_category_codes
      FROM institute_types it
      LEFT JOIN participant_category_institute_types pcit
        ON pcit.institute_type_id = it.id
      LEFT JOIN participant_categories pc
        ON pc.id = pcit.participant_category_id
      WHERE it.is_active = TRUE
        ${
            participantCategory
                ? `AND EXISTS (
                SELECT 1
                FROM participant_category_institute_types filter_pcit
                JOIN participant_categories filter_pc
                  ON filter_pc.id = filter_pcit.participant_category_id
                WHERE filter_pcit.institute_type_id = it.id
                  AND (
                    UPPER(filter_pc.code) = UPPER($1)
                    OR LOWER(filter_pc.name_en) = LOWER($1)
                  )
              )`
                : ""
        }
      GROUP BY it.id
      ORDER BY it.sort_order, it.name_en
    `,
        values,
    );

    return result.rows.map(instituteTypeFromRow);
}

async function getInstituteTypesByParticipantCategory(
    pg: DatabaseClient,
    participantCategory = "",
) {
    const values = participantCategory ? [participantCategory] : [];
    const result = await pg.query<InstituteTypeByParticipantCategoryRow>(
        `
      SELECT
        pc.code AS participant_category_code,
        pc.sort_order AS participant_category_sort_order,
        it.id,
        it.name_en,
        it.name_bn,
        it.name_hi,
        it.sort_order
      FROM participant_category_institute_types pcit
      JOIN participant_categories pc
        ON pc.id = pcit.participant_category_id
      JOIN institute_types it
        ON it.id = pcit.institute_type_id
      WHERE pc.is_active = TRUE
        AND it.is_active = TRUE
        ${
            participantCategory
                ? `AND (
                    UPPER(pc.code) = UPPER($1)
                    OR LOWER(pc.name_en) = LOWER($1)
                  )`
                : ""
        }
      ORDER BY pc.sort_order, it.sort_order, it.name_en
    `,
        values,
    );

    return instituteTypesByParticipantCategoryFromRows(result.rows);
}

async function getParticipantCategoryInstituteTypes(pg: DatabaseClient) {
    const result = await pg.query<ParticipantCategoryInstituteTypeRow>(`
    SELECT
      pc.id AS participant_category_id,
      pc.code AS participant_category_code,
      pc.name_en AS participant_category_name_en,
      pc.name_bn AS participant_category_name_bn,
      pc.name_hi AS participant_category_name_hi,
      it.id AS institute_type_id,
      it.name_en AS institute_type_name_en,
      it.name_bn AS institute_type_name_bn,
      it.name_hi AS institute_type_name_hi
    FROM participant_category_institute_types pcit
    JOIN participant_categories pc
      ON pc.id = pcit.participant_category_id
    JOIN institute_types it
      ON it.id = pcit.institute_type_id
    WHERE pc.is_active = TRUE
      AND it.is_active = TRUE
    ORDER BY pc.sort_order, it.sort_order, it.name_en
  `);

    return result.rows.map(participantCategoryInstituteTypeFromRow);
}

async function getChallengeCategories(pg: DatabaseClient) {
    const result = await pg.query<NamedRow>(`
    SELECT id, name_en, name_bn, name_hi, sort_order
    FROM challenge_categories
    WHERE is_active = TRUE
    ORDER BY sort_order, name_en
  `);

    return result.rows.map(listItemFromRow);
}

async function getLookups(pg: DatabaseClient) {
    const [
        states,
        districts,
        participantCategories,
        instituteTypes,
        challengeCategories,
    ] = await Promise.all([
        getStates(pg),
        getDistricts(pg),
        getParticipantCategories(pg),
        getInstituteTypes(pg),
        getChallengeCategories(pg),
    ]);

    return {
        challengeCategories,
        districts,
        instituteTypes,
        participantCategories,
        states,
    };
}

export const commonService = {
    getAppSettings,
    getChallengeCategories,
    getDistricts,
    getInstituteTypesByParticipantCategory,
    getInstituteTypes,
    getLookups,
    getParticipantCategories,
    getParticipantCategoryInstituteTypes,
    getStates,
};
