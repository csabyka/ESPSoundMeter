import {AnalyticsResponse, Env, Sensor} from '../types';
// @ts-ignore
import dayjs from 'dayjs';

const sensorIds: Sensor['entity_id'][] = [
	'sensor.soundmeter_laeq_1min',
	'sensor.soundmeter_lamax_1s_1min',
	'sensor.soundmeter_lamin_1s_1min',
	'sensor.soundmeter_lapeak_1min',
	'sensor.soundmeter_lceq_1min',
	'sensor.soundmeter_lcmax_1s_1min',
	'sensor.soundmeter_lcmin_1s_1min',
	'sensor.soundmeter_lcpeak_1min',
	'sensor.soundmeter_lzeq_1min',
	'sensor.soundmeter_lzeq_1s',
	'sensor.soundmeter_lzmax_1s_1min',
	'sensor.soundmeter_lzmin_1s_1min',
	'sensor.soundmeter_lzpeak_1min',
];

function getData(query: string, env: Env): Promise<AnalyticsResponse> {
	return fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/analytics_engine/sql`, {
		method: 'POST',
		headers: { 'Authorization': `Bearer ${env.ANALYTICS_API_TOKEN}` },
		body: query,
	}).then(async (res) => {
		if (!res.ok) {
			console.log('GET DATA ERROR', await res.text());
			return {meta: null, data: []};
		}

		return res.json();
	});
}

function writeDataPoint(sensors: Sensor[], dataset: AnalyticsEngineDataset, sensorIds: string[], index: string) {
	dataset.writeDataPoint({
		blobs: sensorIds,
		doubles: sensorIds.map(id => {
			const sensor = sensors.find(s => s.entity_id === id);
			return parseFloat(sensor?.state) || 0;
		}),
		indexes: [index]
	});
}

const app = {
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		const sensors: Sensor[] = await fetch('https://ha.csy.space/api/states', {
			headers: new Headers({ Authorization: `Bearer ${env.HOME_ASSISTANT_BEARER_TOKEN}` })
		}).then(res => res.json());

		writeDataPoint(sensors, env.SOUNDMETER, sensorIds, 'esp-sound-meter');
		writeDataPoint(sensors, env.SOUNDMETER_E1, sensorIds.map(id => id.replace('soundmeter_', 'soundmeter_external1_')), 'esp-sound-meter-external-1');
		writeDataPoint(sensors, env.SOUNDMETER_E2, sensorIds.map(id => id.replace('soundmeter_', 'soundmeter_external2_')), 'esp-sound-meter-external-2');
		writeDataPoint(sensors, env.SOUNDMETER_E3, sensorIds.map(id => id.replace('soundmeter_', 'soundmeter_external3_')), 'esp-sound-meter-external-3');
		writeDataPoint(sensors, env.SOUNDMETER_E4, sensorIds.map(id => id.replace('soundmeter_', 'soundmeter_external4_')), 'esp-sound-meter-external-4');
		writeDataPoint(sensors, env.SOUNDMETER_E5, sensorIds.map(id => id.replace('soundmeter_', 'soundmeter_external5_')), 'esp-sound-meter-external-5');
		writeDataPoint(sensors, env.SOUNDMETER_E6, sensorIds.map(id => id.replace('soundmeter_', 'soundmeter_external6_')), 'esp-sound-meter-external-6');
		writeDataPoint(sensors, env.SOUNDMETER_E7, sensorIds.map(id => id.replace('soundmeter_', 'soundmeter_external7_')), 'esp-sound-meter-external-7');
	},
	async fetch(req: Request, env: Env) {
		const params = new URL(req.url).searchParams;
		let range: any = params.get('range');
		let hours = parseInt(params.get('hours')) || 3;
		const onlyLatest = params.has('onlyLatest');

		if (hours < 1) hours = 1;
		else if (hours > 12) hours = 12;

		range = range ? range.split('-').map((t: string) => +t) : [dayjs().add(hours * -1, 'h').unix()];

		let whereCondition = [
			range.length > 0 ? `(timestamp > toDateTime(${range[0]}))` : null,
			range.length > 1 ? `(timestamp <= toDateTime(${range[1]}))` : null,
		].filter(Boolean).join(' AND ');

		// SQL string to be executed.
		const query = `
            SELECT 
                double1 as value,
                timestamp,
                TYPE as type
            FROM SoundMeter
            ${whereCondition ? 'WHERE ' + whereCondition : ''}
            ORDER BY timestamp ${onlyLatest ? 'DESC' : 'ASC'}
            ${onlyLatest ? 'LIMIT 1' : ''}`;

		const queryResponses = await Promise.all([
			getData(query.replace('TYPE', "'home'"), env),
			getData(query
				.replace('SoundMeter', 'SoundMeter_E1')
				.replace('TYPE', "'external_1'"), env),
			getData(query
				.replace('SoundMeter', 'SoundMeter_E2')
				.replace('TYPE', "'external_2'"), env),
			getData(query
				.replace('SoundMeter', 'SoundMeter_E3')
				.replace('TYPE', "'external_3'"), env),
			getData(query
				.replace('SoundMeter', 'SoundMeter_E4')
				.replace('TYPE', "'external_4'"), env),
			getData(query
				.replace('SoundMeter', 'SoundMeter_E5')
				.replace('TYPE', "'external_5'"), env),
			getData(query
				.replace('SoundMeter', 'SoundMeter_E6')
				.replace('TYPE', "'external_6'"), env),
			getData(query
				.replace('SoundMeter', 'SoundMeter_E7')
				.replace('TYPE', "'external_7'"), env),

		]).then(data => data.flatMap(d => d.data));

		return Response.json({
			values: queryResponses,
			locations: [
				{type: 'home', lat: 47.015748, lng: 18.205129},
				{type: 'external_1', lat: 47.014146, lng: 18.206357},
				// {type: 'external_2', lat: 0, lng: 0},
				// {type: 'external_3', lat: 0, lng: 0},
				// {type: 'external_4', lat: 0, lng: 0},
				{type: 'external_5', lat: 47.023494, lng: 18.211152}, // approx
				{type: 'external_6', lat: 46.990495, lng: 18.178974},
				{type: 'external_7', lat: 47.025650, lng: 18.207185},
			]
		}, {
			headers: new Headers({
				'Access-Control-Allow-Origin': '*'
			})
		});
	}
};

export default app;