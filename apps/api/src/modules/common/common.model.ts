import type { QueryResultRow } from "pg";

export type LanguageMap = {
  bn: string;
  en: string;
  hi: string;
};

export type NamedRow = QueryResultRow & {
  id: string | number;
  name_bn: string;
  name_en: string;
  name_hi: string;
  sort_order?: string | number;
};

export type DistrictRow = NamedRow & {
  state_id: string | number;
  state_name_bn: string;
  state_name_en: string;
  state_name_hi: string;
};

export type ParticipantCategoryRow = NamedRow & {
  code: string;
};

export type InstituteTypeRow = NamedRow & {
  participant_category_codes?: string[];
};

export type InstituteTypeByParticipantCategoryRow = NamedRow & {
  participant_category_code: string;
  participant_category_sort_order: string | number;
};

export type ParticipantCategoryInstituteTypeRow = QueryResultRow & {
  institute_type_id: string | number;
  institute_type_name_bn: string;
  institute_type_name_en: string;
  institute_type_name_hi: string;
  participant_category_code: string;
  participant_category_id: string | number;
  participant_category_name_bn: string;
  participant_category_name_en: string;
  participant_category_name_hi: string;
};

function toNumber(value: string | number) {
  return typeof value === "number" ? value : Number(value);
}

function nameFromRow(row: NamedRow): LanguageMap {
  return {
    bn: row.name_bn,
    en: row.name_en,
    hi: row.name_hi,
  };
}

export function listItemFromRow(row: NamedRow) {
  return {
    id: toNumber(row.id),
    name: nameFromRow(row),
    sortOrder:
      row.sort_order === undefined ? undefined : toNumber(row.sort_order),
  };
}

export function participantCategoryFromRow(row: ParticipantCategoryRow) {
  return {
    ...listItemFromRow(row),
    code: row.code,
  };
}

export function districtFromRow(row: DistrictRow) {
  return {
    ...listItemFromRow(row),
    state: {
      id: toNumber(row.state_id),
      name: {
        bn: row.state_name_bn,
        en: row.state_name_en,
        hi: row.state_name_hi,
      },
    },
    stateId: toNumber(row.state_id),
  };
}

export function instituteTypeFromRow(row: InstituteTypeRow) {
  return {
    ...listItemFromRow(row),
    participantCategoryCodes: row.participant_category_codes ?? [],
  };
}

export function instituteTypesByParticipantCategoryFromRows(
  rows: InstituteTypeByParticipantCategoryRow[],
) {
  const grouped = new Map<
    string,
    {
      instituteTypes: Array<{
        id: number;
        name: {
          bn: string;
          en: string;
          hn: string;
        };
        sortOrder: number;
      }>;
      participantCode: string;
      sortOrder: number;
    }
  >();

  rows.forEach((row) => {
    const participantCode = row.participant_category_code;
    const group = grouped.get(participantCode) ?? {
      instituteTypes: [],
      participantCode,
      sortOrder: toNumber(row.participant_category_sort_order),
    };

    group.instituteTypes.push({
      id: toNumber(row.id),
      name: {
        bn: row.name_bn,
        en: row.name_en,
        hn: row.name_hi,
      },
      sortOrder:
        row.sort_order === undefined ? 0 : toNumber(row.sort_order),
    });

    grouped.set(participantCode, group);
  });

  return {
    participantCategory: Array.from(grouped.values()).map(
      ({ sortOrder: _sortOrder, ...group }) => group,
    ),
  };
}

export function participantCategoryInstituteTypeFromRow(
  row: ParticipantCategoryInstituteTypeRow,
) {
  return {
    instituteType: {
      id: toNumber(row.institute_type_id),
      name: {
        bn: row.institute_type_name_bn,
        en: row.institute_type_name_en,
        hi: row.institute_type_name_hi,
      },
    },
    participantCategory: {
      code: row.participant_category_code,
      id: toNumber(row.participant_category_id),
      name: {
        bn: row.participant_category_name_bn,
        en: row.participant_category_name_en,
        hi: row.participant_category_name_hi,
      },
    },
  };
}
