import React, {useLayoutEffect, useState} from 'react';
import './App.css';
// import { DatePicker, TimeRangePickerProps } from "antd";
import dayjs from 'dayjs';
import { Line } from '@ant-design/plots';

function App() {
  const [data, setData] = useState<any[]>([]);
  // const rangePresets: TimeRangePickerProps['presets'] = [
  //   { label: 'Last 7 Days', value: [dayjs().add(-7, 'd'), dayjs()] },
  //   { label: 'Last 14 Days', value: [dayjs().add(-14, 'd'), dayjs()] },
  //   { label: 'Last 30 Days', value: [dayjs().add(-30, 'd'), dayjs()] },
  //   { label: 'Last 90 Days', value: [dayjs().add(-90, 'd'), dayjs()] },
  // ];

  // const onRangeChange = (dates: null | (Dayjs | null)[], dateStrings: string[]) => {
  //   if (dates) {
  //     console.log('From: ', dates[0], ', to: ', dates[1]);
  //     console.log('From: ', dateStrings[0], ', to: ', dateStrings[1]);
  //   } else {
  //     console.log('Clear');
  //   }
  // };

  useLayoutEffect(() => {
    const controller = new AbortController();

    fetch('https://esp-sound-meter.balaton.workers.dev/', {signal: controller.signal})
        .then((res) => res.json())
        .then(res => {
          setData(res.map((state: {timestamp: string, value: number}) => {
              state.timestamp = dayjs(state.timestamp).format('YYYY-MM-DD HH:mm');
              return state;
          }));
        });

    // return () => {
    //   controller.abort();
    // }
  }, []);

  return (
    <div className="App">
      {/*<DatePicker.RangePicker presets={rangePresets} onChange={onRangeChange} />*/}
      <Line
          data={data}
          x={{type: 'band'}}
          className="chart"
          xField="timestamp"
          yField="value"
          annotations={[{
            type: "lineY",
            yField: 50,
            style: { stroke: "#FC2947", strokeOpacity: 1, lineWidth: 2 },
          }]}
          line={{
            style: {
              stroke: '#35374B',
              strokeWidth: 2,
            },
          }}
          tooltip={{
            title: 'dBa',
            items: [{
              channel: 'x',
              name: 'Timestamp',
              color: '#fff',
            }, {
              channel: 'y',
              name: 'dBa',
              field: 'value',
              valueFormatter: (value: number) => `${value} dBa`,
            }],
          }}
      />
    </div>
  );
}

export default App;
