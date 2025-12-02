"use client";

import { formatDate } from "@/modules/common/utils/formatDate";
import type { SetOptionOpts } from "echarts";
import { LineChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from "echarts/components";
import type { EChartsCoreOption, EChartsType } from "echarts/core";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import type { CallbackDataParams } from "echarts/types/dist/shared";
import { useEffect, useRef } from "react";

interface Props {
  readonly axis: number[];
  readonly series: {
    name: string;
    data: (number | null)[];
  }[];
  readonly height?: number;
}

echarts.use([
  LineChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

const PALETTE = [
  "#38bdf8",
  "#f472b6",
  "#a855f7",
  "#f97316",
  "#22d3ee",
  "#4ade80",
  "#facc15",
  "#fb7185",
];

export const StatisticChart = ({ axis, series, height = 360 }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<EChartsType | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    chartRef.current = echarts.init(containerRef.current, undefined, {
      renderer: "canvas",
    });

    const handleResize = () => chartRef.current?.resize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;

    const option = {
      backgroundColor: "transparent",
      color: PALETTE,
      grid: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
      },
      legend: {
        show: false,
      },
      tooltip: {
        trigger: "axis",
        className: "!bg-neutral-950 border !border-neutral-700",
        formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
          const items = Array.isArray(params) ? params : [params];

          const axisValue = items[0]?.value;
          const axisTimestamp = Array.isArray(axisValue)
            ? axisValue[0]
            : axisValue;
          const dateLabel =
            typeof axisTimestamp === "number"
              ? formatDate(new Date(axisTimestamp), "short")
              : "";

          const rows = items
            .slice()
            .sort((a, b) => {
              const aValueRaw = Array.isArray(a.value) ? a.value[1] : a.value;
              const bValueRaw = Array.isArray(b.value) ? b.value[1] : b.value;
              const aValue =
                typeof aValueRaw === "number" ? aValueRaw : -Infinity;
              const bValue =
                typeof bValueRaw === "number" ? bValueRaw : -Infinity;
              return bValue - aValue;
            })
            .slice(0, 10)
            .map((item) => {
              const color =
                typeof item.color === "string" ? item.color : "#ffffff";
              const value = Array.isArray(item.value)
                ? item.value[1]
                : item.value;
              const formattedValue =
                typeof value === "number" ? value.toLocaleString("de-DE") : "—";

              return `
                <div class="text-white" style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="width: 0.65rem; height: 0.65rem; border-radius: 9999px; background: ${color}; display: inline-block;"></span>
                  <span style="flex: 1;">${item.seriesName ?? ""}</span>
                  <strong>${formattedValue}</strong>
                </div>`.trim();
            })
            .join("\n");

          return `
            <div>
              <div class="text-neutral-500 text-xs mb-2">
                ${dateLabel}
              </div>

              ${rows}
            </div>
          `;
        },
      },
      xAxis: {
        type: "time",
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: "rgba(226,232,240,0.15)",
          },
        },
        axisLabel: {
          color: "#9ca3af",
          formatter: (value: number | string) =>
            formatDate(new Date(Number(value)), "short"),
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: "value",
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: "#9ca3af",
        },
        splitLine: {
          lineStyle: {
            color: "rgba(226,232,240,0.1)",
          },
        },
      },
      dataZoom: [
        {
          type: "inside",
          brushSelect: false,
          moveOnMouseWheel: true,
          zoomOnMouseWheel: false,
        },
      ],
      series: series.map((serie) => ({
        name: serie.name,
        type: "line",
        smooth: true,
        showSymbol: false,
        emphasis: {
          focus: "series",
        },
        lineStyle: {
          width: 2,
        },
        data: axis.map((timestamp, index) => [
          timestamp,
          serie.data[index] ?? null,
        ]),
      })),
    } satisfies EChartsCoreOption;

    const replaceOptions: SetOptionOpts = {
      notMerge: true,
      lazyUpdate: false,
    };

    chartRef.current.setOption(option, replaceOptions);
  }, [axis, series]);

  return <div ref={containerRef} style={{ height }} />;
};
