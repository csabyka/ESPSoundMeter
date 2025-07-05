import {Dayjs} from 'dayjs';

// Application types
export type Row = {
    timestamp: string,
    value: number
};

export type Location = {
    type: string,
    lat: number,
    lng: number
};

export type Range = [Dayjs | null, Dayjs | null]; 