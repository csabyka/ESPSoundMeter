import React, {useCallback, useLayoutEffect, useMemo, useState} from 'react';
import './App.css';
import {Button, DatePicker, Space, TimeRangePickerProps} from "antd";
import dayjs, {Dayjs} from 'dayjs';
import {Line} from '@ant-design/plots';

type Row = {
    timestamp: string,
    value: number
};
type Range = [Dayjs | null, Dayjs | null];

function App() {
    const [data, setData] = useState<Row[]>([]);
    const [range, setRange] = useState<Range>([null, null]);
    const rangePresets: TimeRangePickerProps['presets'] = useMemo(() => {
        const now = dayjs();

        return [
            {label: 'Last 1 hour', value: [now.add(-1, 'h'), now]},
            {label: 'Last 3 hours', value: [now.add(-3, 'h'), now]},
            {label: 'Last 6 hours', value: [now.add(-6, 'h'), now]},
            {label: 'Last 9 hours', value: [now.add(-9, 'h'), now]},
            {label: 'Last 12 hours', value: [now.add(-12, 'h'), now]},
            {label: 'Last 24 hours', value: [now.add(-24, 'h'), now]},
            {label: 'Last 1 week', value: [now.add(-168, 'h'), now]},
        ]
    }, []);
    const stat = useMemo(() => {
        const values = data.map(state => state.value).filter(v => v > 0);
        return {
            max: Math.max(...values),
            // avg: values.reduce((sum, value) => sum + value, 0) / values.length,
        };
    }, [data]);
    const onRangeChange = (dates: null | (Dayjs | null)[]) => {
        setRange(dates as Range);
    };

    function getUrl(rangeArr: Range | null) {
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

    const loadData: ((rangeArr: Range | null) => void) = useCallback(function (rangeArr: Range | null) {
        fetch(getUrl(rangeArr))
            .then((res) => res.json())
            .then(res => {
                setData(res.map((state: { timestamp: string, value: number }) => {
                    state.timestamp = dayjs(state.timestamp).add(2, 'h').format('YYYY-MM-DD HH:mm');
                    return state;
                }));
            });
    }, []);

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
    }, [loadData]);

    return (
        <div className="App">
            <div className="headline">
                <Space align="start">
                    <b>Max: {data.length > 0 ? stat.max : 0} dBa</b>
                </Space>
                <Space>
                    <DatePicker.RangePicker
                        showTime
                        showSecond={false}
                        value={range}
                        presets={rangePresets}
                        onChange={onRangeChange}/>
                    <Button disabled={!range} type="primary" onClick={applyFilter}>Apply</Button>
                </Space>
            </div>
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
                colorField="type"
                annotations={[{
                    type: "lineY",
                    yField: 50,
                    style: {stroke: "#FC2947", strokeOpacity: 1, lineWidth: 2},
                }]}
            />
        </div>
    );
}

export default App;
