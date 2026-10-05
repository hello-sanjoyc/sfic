import { apiClient } from "@/lib/api-client";
import { endpoints } from "@/lib/endpoints";

export type AppSetting = {
    key: string;
    value: string;
};

export type AppSettingsMap = Record<string, string>;

export const registrationSettingKeys = {
    enabled: "PARTICIPANT_REGISTRATION_ENABLED",
    endDate: "PARTICIPANT_REGISTRATION_END_DATE",
    startDate: "PARTICIPANT_REGISTRATION_START_DATE",
} as const;

type RegistrationDateSettingKey =
    | typeof registrationSettingKeys.startDate
    | typeof registrationSettingKeys.endDate;

const defaultRegistrationStartDate = "2026-09-19";
const defaultRegistrationEndDate = "2026-10-30";

export function settingsMap(settings: AppSetting[]) {
    return Object.fromEntries(
        settings.map((setting) => [setting.key, setting.value]),
    );
}

export async function getAppSettings() {
    return apiClient.get<AppSetting[]>(endpoints.common.appSettings);
}

export function booleanSetting(settings: AppSettingsMap, key: string) {
    return settings[key]?.trim().toLowerCase() === "true";
}

export function getRegistrationDateValue(
    settings: AppSettingsMap,
    key: RegistrationDateSettingKey,
) {
    const value = settings[key]?.trim();
    if (value) return value;

    return (
        key === registrationSettingKeys.startDate
            ? defaultRegistrationStartDate
            : defaultRegistrationEndDate
    );
}

function parseDateOnly(value: string, endOfDay = false) {
    const trimmedValue = value.trim();
    const match = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (match) {
        const [, yearText, monthText, dayText] = match;
        const year = Number(yearText);
        const month = Number(monthText);
        const day = Number(dayText);
        const date = new Date(year, month - 1, day);

        if (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
        ) {
            if (endOfDay) date.setHours(23, 59, 59, 999);
            return date;
        }
    }

    const date = new Date(trimmedValue);
    if (Number.isNaN(date.getTime())) return null;
    if (endOfDay) date.setHours(23, 59, 59, 999);
    return date;
}

export function dateSetting(
    settings: AppSettingsMap,
    key: RegistrationDateSettingKey,
    endOfDay = false,
) {
    const value = getRegistrationDateValue(settings, key);
    return parseDateOnly(value, endOfDay);
}

export function formatRegistrationDate(value: string, locale = "en-IN") {
    const date = parseDateOnly(value);
    if (!date) return value;

    return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(date);
}

export function formatShortRegistrationDate(value: string, locale = "en-IN") {
    const date = parseDateOnly(value);
    if (!date) return value;

    return new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
        .format(date)
        .replaceAll(",", "");
}

export function registrationPeriodText(
    settings: AppSettingsMap,
    locale = "en-IN",
) {
    return `${formatRegistrationDate(
        getRegistrationDateValue(settings, registrationSettingKeys.startDate),
        locale,
    )} - ${formatRegistrationDate(
        getRegistrationDateValue(settings, registrationSettingKeys.endDate),
        locale,
    )}`;
}

export function shortRegistrationPeriodText(
    settings: AppSettingsMap,
    locale = "en-IN",
) {
    return `${formatShortRegistrationDate(
        getRegistrationDateValue(settings, registrationSettingKeys.startDate),
        locale,
    )} - ${formatShortRegistrationDate(
        getRegistrationDateValue(settings, registrationSettingKeys.endDate),
        locale,
    )}`;
}

export function registrationAvailability(
    settings: AppSettingsMap,
    now = new Date(),
) {
    if (!booleanSetting(settings, registrationSettingKeys.enabled)) {
        return {
            canRegister: false,
            message: "Participant registration is currently closed.",
        };
    }

    const startDate = dateSetting(settings, registrationSettingKeys.startDate);
    const endDate = dateSetting(settings, registrationSettingKeys.endDate, true);

    if (startDate && now < startDate) {
        return {
            canRegister: false,
            message: `Participant registration will open on ${formatRegistrationDate(
                getRegistrationDateValue(
                    settings,
                    registrationSettingKeys.startDate,
                ),
            )}.`,
        };
    }

    if (endDate && now > endDate) {
        return {
            canRegister: false,
            message: `Participant registration closed on ${formatRegistrationDate(
                getRegistrationDateValue(
                    settings,
                    registrationSettingKeys.endDate,
                ),
            )}.`,
        };
    }

    return {
        canRegister: true,
        message: "",
    };
}
