"use client";

// @refresh reset

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
import type { StatisticChartData } from "../queries";

interface Props {
  readonly chart: StatisticChartData;
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

export const StatisticChart = ({ chart }: Props) => {
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

    const resolvedYAxes = chart.yAxes?.length
      ? chart.yAxes
      : [{ position: "left" as const }];

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
        className: "!bg-neutral-950 border !border-neutral-700 !text-white",
        formatter: (params: CallbackDataParams | CallbackDataParams[]) => {
          const items = Array.isArray(params) ? params : [params];

          const axisValueRaw =
            items[0] && "axisValue" in items[0]
              ? (items[0] as { axisValue?: number | string }).axisValue
              : items[0]?.value;
          const axisTimestamp =
            typeof axisValueRaw === "number" || typeof axisValueRaw === "string"
              ? Number(axisValueRaw)
              : undefined;
          const dateLabel =
            typeof axisTimestamp === "number"
              ? formatDate(new Date(axisTimestamp), "short")
              : "";

          const sortedItems = items.slice().toSorted((a, b) => {
            const aValueRaw = Array.isArray(a.value) ? a.value[1] : a.value;
            const bValueRaw = Array.isArray(b.value) ? b.value[1] : b.value;
            const aValue =
              typeof aValueRaw === "number" ? aValueRaw : -Infinity;
            const bValue =
              typeof bValueRaw === "number" ? bValueRaw : -Infinity;
            return bValue - aValue;
          });

          const limitedItems = chart.configuration?.top
            ? sortedItems.slice(0, chart.configuration.top)
            : sortedItems;

          const rowsHtml = limitedItems
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
              <p class="mb-2">
                ${dateLabel}
              </p>

              ${chart.configuration?.top ? `<p class="text-neutral-500 text-xs">Top ${chart.configuration.top}</p>` : ""}

              ${rowsHtml}
            </div>
          `;
        },
      },
      xAxis: {
        // Use a category axis so each data point renders exactly one label.
        type: "category",
        boundaryGap: false,
        data: chart.axisTimestamps,
        axisLabel: {
          color: "#737373",
          interval: 0,
          formatter: (value: number | string) =>
            formatDate(new Date(Number(value)), "extra_short"),
        },
        axisTick: {
          alignWithLabel: true,
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: resolvedYAxes.map((axis, index) => {
        const axisLabelColor = axis.axisLabelColor ?? "#737373";

        return {
          type: "value",
          position: axis.position ?? (index === 0 ? "left" : "right"),
          name: axis.name,
          axisLabel: {
            color: axisLabelColor,
          },
          nameTextStyle: {
            color: axisLabelColor,
          },
          axisLine: {
            lineStyle: {
              color: axisLabelColor,
            },
          },
          splitLine: {
            show: index === 0,
            lineStyle: {
              color: "rgba(255, 255, 255, 0.05)",
            },
          },
        };
      }),
      series: chart.series.map((serie) => ({
        name: serie.name,
        type: "line",
        smooth: true,
        emphasis: {
          focus: "series",
        },
        lineStyle: {
          width: 2,
        },
        yAxisIndex: serie.yAxisIndex ?? 0,
        data: chart.axisTimestamps.map((_, index) => serie.data[index] ?? null),
        symbol: "circle",
        symbolSize: 4,
        showSymbol: false,
      })),
      animationDuration: 300,
    } satisfies EChartsCoreOption;

    const replaceOptions: SetOptionOpts = {
      notMerge: true,
      lazyUpdate: false,
    };

    chartRef.current.setOption(option, replaceOptions);
  }, [chart]);

  return <div ref={containerRef} style={{ height: 360 }} />;
};
