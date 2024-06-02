import {AnalyticsResponse, Env, Sensor} from '../types';

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

export default {
	async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		const sensors: Sensor[] = await fetch('https://ha.csy.space/api/states', {
			headers: new Headers({ Authorization: `Bearer ${env.HOME_ASSISTANT_BEARER_TOKEN}` })
		})
			.then(res => res.json())
			.then((s: Sensor[]) => s.filter(sensor => sensorIds.includes(sensor.entity_id)));

		const sensorSates = sensorIds.map(id => {
			const sensor = sensors.find(s => s.entity_id === id);
			return parseFloat(sensor?.state) || 0;
		});

		if (sensorSates.some(state => state > 0)) {
			env.SOUNDMETER.writeDataPoint({
				blobs: sensorIds,
				doubles: sensorSates,
				indexes: ['esp-sound-meter']
			});

			console.log('Sensor data saved', Date.now());
		} else {
			console.log('Sensor turned off', Date.now());
		}
	},
	async fetch(req: Request, env: Env) {
		// SQL string to be executed.
		const query = `
            SELECT 
                double1 as value,
                timestamp
            FROM SoundMeter
            WHERE timestamp > NOW() - INTERVAL '2' HOUR
            ORDER BY timestamp ASC`;

		const queryResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.ACCOUNT_ID}/analytics_engine/sql`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${env.ANALYTICS_API_TOKEN}`,
			},
			body: query,
		});

		if (queryResponse.status != 200) {
			console.error('Error querying:', await queryResponse.text());
			return new Response('An error occurred!', {status: 500});
		}

		const queryJSON: AnalyticsResponse = await queryResponse.json();
		return Response.json(queryJSON.data, {
			headers: new Headers({
				'Access-Control-Allow-Origin': '*'
			})
		});
	}
};