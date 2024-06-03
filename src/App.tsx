import React, {useLayoutEffect, useState} from 'react';
import './App.css';
import {Button, DatePicker, Space, TimeRangePickerProps} from "antd";
import dayjs, {Dayjs} from 'dayjs';
import { Line } from '@ant-design/plots';

type Range = [Dayjs|null, Dayjs|null];

function App() {
  const [data, setData] = useState<any[]>([]);
  const [range, setRange] = useState<Range>([null, null]);
  const rangePresets: TimeRangePickerProps['presets'] = [
    { label: 'Last 1 hour', value: [dayjs().add(-1, 'h'), dayjs()] },
    { label: 'Last 3 hours', value: [dayjs().add(-3, 'h'), dayjs()] },
    { label: 'Last 6 hours', value: [dayjs().add(-6, 'h'), dayjs()] },
    { label: 'Last 9 hours', value: [dayjs().add(-9, 'h'), dayjs()] },
    { label: 'Last 12 hours', value: [dayjs().add(-12, 'h'), dayjs()] },
  ];

  const onRangeChange = (dates: null | (Dayjs | null)[], dateStrings: string[]) => {
      setRange(dates as Range);
  };

  function getUrl(rangeArr: Range|null) {
      const url = new URL('https://esp-sound-meter.balaton.workers.dev');
      if (Array.isArray(rangeArr)) {
          url.searchParams.set('range', rangeArr.map(t => t?.unix()).join('-'));
      }

      return url.toString();
  }

  function applyFilter() {
    let url = new URL(getUrl(range));
    window.history.pushState({}, '', url.search)
    loadData(range);
  }

  function loadData(rangeArr: Range|null) {
      fetch(getUrl(rangeArr))
          .then((res) => res.json())
          .then(res => {
              setData(res.map((state: {timestamp: string, value: number}) => {
                  state.timestamp = dayjs(state.timestamp).add(2, 'h').format('YYYY-MM-DD HH:mm');
                  return state;
              }));
          });
  }

  useLayoutEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // const hours = parseInt(params.get('hours') as string) || 3;
    const rangeParam = params.get('range');

    const rangeArr = rangeParam
        ? rangeParam.split('-').map((t) => {
            const timestamp = dayjs.unix(+t);
            return timestamp.isValid() ? timestamp : null;
        }) as Range : [dayjs().add(-3, 'h'), dayjs()] as Range;

    setRange(rangeArr);

    // @ts-ignore
    window.dayjs = dayjs;

    loadData(rangeArr);

    // return () => {
    //   controller.abort();
    // }
  }, []);

  return (
    <div className="App">
      <Space>
        <DatePicker.RangePicker showTime showSecond={false} value={range} presets={rangePresets} onChange={onRangeChange} />
        <Button disabled={!range} type="primary" onClick={applyFilter}>Apply</Button>
      </Space>
      <Line
          data={data}
          axis={{
              x: {
                  labelFilter: (datum: string, idx: number) => idx % 9 === 0,
              }
          }}
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
