export type Env = {
    HOME_ASSISTANT_BEARER_TOKEN: string, // secret
    ANALYTICS_API_TOKEN: string, // secret
    ACCOUNT_ID: string,
    SOUNDMETER: AnalyticsEngineDataset,
}

export type Sensor = {
    entity_id: string,
    state: string,
    attributes: Record<string, any>,
    last_changed: string,
    last_reported: string,
    last_updated: string,
    context: {
        id: string,
        parent_id: null,
        user_id: null
    }
}

export type AnalyticsResponse = {
    meta: Record<string, any>,
    data: Record<string, any>[]
}