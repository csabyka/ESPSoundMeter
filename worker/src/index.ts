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

export default {
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		const sensors: Sensor[] = await fetch('https://ha.csy.space/api/states', {
			headers: new Headers({ Authorization: `Bearer ${env.HOME_ASSISTANT_BEARER_TOKEN}` })
		}).then(res => res.json());

		env.SOUNDMETER.writeDataPoint({
			blobs: sensorIds,
			doubles: sensorIds.map(id => {
				const sensor = sensors.find(s => s.entity_id === id);
				return parseFloat(sensor?.state) || 0;
			}),
			indexes: ['esp-sound-meter']
		});

		const sensorIdsExternal1 = sensorIds.map((id) => id.replace('soundmeter_', 'soundmeter_external1_'));
		env.SOUNDMETER_E1.writeDataPoint({
			blobs: sensorIdsExternal1,
			doubles: sensorIdsExternal1.map(id => {
				const sensor = sensors.find(s => s.entity_id === id);
				return parseFloat(sensor?.state) || 0;
			}),
			indexes: ['esp-sound-meter-external-1']
		});

		const sensorIdsExternal2 = sensorIds.map((id) => id.replace('soundmeter_', 'soundmeter_external2_'));
		env.SOUNDMETER_E2.writeDataPoint({
			blobs: sensorIdsExternal2,
			doubles: sensorIdsExternal2.map(id => {
				const sensor = sensors.find(s => s.entity_id === id);
				return parseFloat(sensor?.state) || 0;
			}),
			indexes: ['esp-sound-meter-external-2']
		});

		const sensorIdsExternal3 = sensorIds.map((id) => id.replace('soundmeter_', 'soundmeter_external3_'));
		env.SOUNDMETER_E3.writeDataPoint({
			blobs: sensorIdsExternal3,
			doubles: sensorIdsExternal3.map(id => {
				const sensor = sensors.find(s => s.entity_id === id);
				return parseFloat(sensor?.state) || 0;
			}),
			indexes: ['esp-sound-meter-external-3']
		});

	},
	async fetch(req: Request, env: Env) {
		const params = new URL(req.url).searchParams;
		let range: any = params.get('range');
		let hours = parseInt(params.get('hours')) || 3;

		if (hours < 1) hours = 1;
		else if (hours > 12) hours = 12;

		range = range ? range.split('-').map((t: string) => +t) : [dayjs().add(hours * -1, 'h').unix()];

		let whereCondition = [];

		if (range.length > 0) {
			whereCondition.push(`(timestamp > toDateTime(${range[0]}))`);
		}

		if (range.length > 1) {
			whereCondition.push(`(timestamp <= toDateTime(${range[1]}))`)
		}

		// SQL string to be executed.
		const query = `
            SELECT 
                double1 as value,
                timestamp,
                TYPE as type
            FROM SoundMeter
            ${whereCondition ? 'WHERE ' + whereCondition.join(' AND ') : ''}
            ORDER BY timestamp ASC`;

		const queryResponses = await Promise.all([
			getData(query.replace('TYPE', "'home'"), env),
			getData(query
				.replace('SoundMeter', 'SoundMeter_E1')
				.replace('TYPE', "'external_1"), env),
			getData(query
				.replace('SoundMeter', 'SoundMeter_E2')
				.replace('TYPE', "'external_2'"), env),
			getData(query
				.replace('SoundMeter', 'SoundMeter_E3')
				.replace('TYPE', "'external_3'"), env),
		]).then(data => data.flatMap(d => d.data));

		return Response.json(queryResponses, {
			headers: new Headers({
				'Access-Control-Allow-Origin': '*'
			})
		});
	}
};
