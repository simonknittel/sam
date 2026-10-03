"use client";

import { Tile } from "@/modules/common/components/Tile";
import clsx from "clsx";
import { useRef, useState, type ChangeEventHandler } from "react";

const CONTAINER_SIZES = [32, 24, 16, 8, 4, 2, 1];

interface ContainerResult {
  [size: number]: number;
  leftover: number;
}

interface Props {
  readonly className?: string;
}

export const ContainerCalculator = ({ className }: Props) => {
  const containerFormRef = useRef<HTMLFormElement>(null);

  const [containerResult, setContainerResult] =
    useState<ContainerResult | null>(null);

  const handleChangeContainer: ChangeEventHandler<HTMLFormElement> = () => {
    if (!containerFormRef.current) return;
    const formData = new FormData(containerFormRef.current);

    const totalScu = parseInt(formData.get("totalScu") as string, 10) || 0;
    // Parse exact values for each container size
    const exacts: Record<number, number | null> = {};
    CONTAINER_SIZES.forEach((size) => {
      const val = parseInt(formData.get(`exact${size}`) as string, 10);
      exacts[size] = Number.isNaN(val) ? null : val;
    });

    // Calculate results
    const results: Record<number, number> = {};
    CONTAINER_SIZES.forEach((size) => {
      results[size] = exacts[size] || 0;
    });

    let leftover =
      totalScu -
      CONTAINER_SIZES.reduce((sum, size) => sum + results[size] * size, 0);

    CONTAINER_SIZES.forEach((size) => {
      if (exacts[size] === null) {
        results[size] = Math.floor(leftover / size);
        leftover -= results[size] * size;
      }
    });

    setContainerResult({ ...results, leftover });
  };

  return (
    <>
      <Tile
        heading="Container Calculator"
        className={clsx(className)}
        childrenClassName="flex flex-col gap-8"
      >
        <form
          ref={containerFormRef}
          onChange={handleChangeContainer}
          className="flex flex-col gap-4"
        >
          <h3 className="text-center text-xl font-semibold text-brand-red-500">
            Angaben
          </h3>

          <div className="flex flex-col items-center gap-1">
            <input
              type="number"
              name="totalScu"
              className="w-44 rounded-secondary border border-solid border-neutral-800 bg-neutral-900 p-2 text-center text-3xl font-black"
              placeholder="0"
              autoFocus
              required
            />
            <label>Gesamt SCU</label>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {CONTAINER_SIZES.map((size) => (
              <div key={size} className="flex flex-col items-center gap-1">
                <input
                  type="number"
                  name={`exact${size}`}
                  className="w-32 rounded-secondary border border-solid border-neutral-800 bg-neutral-900 p-2 text-center text-3xl font-black"
                />
                <label>{size} SCU</label>
              </div>
            ))}
          </div>
        </form>

        <hr className="border-neutral-800" />

        <div className="flex flex-col gap-4">
          <h3 className="text-center text-xl font-semibold text-brand-red-500">
            Ergebnis
          </h3>

          {containerResult ? (
            <ul className="flex flex-wrap justify-center gap-4">
              {CONTAINER_SIZES.map((size) => (
                <li
                  key={size}
                  className="flex w-32 flex-col items-center gap-1"
                >
                  <p className="text-3xl font-black">{containerResult[size]}</p>

                  <p>{size} SCU</p>
                </li>
              ))}

              <li className="flex w-32 flex-col items-center gap-1">
                <p className="text-3xl font-black">
                  {containerResult.leftover}
                </p>

                <p>Verbleibend</p>
              </li>
            </ul>
          ) : (
            <p className="text-center">
              Die Gesamt SCU-Menge muss zuerst angegeben werden.
            </p>
          )}
        </div>
      </Tile>
    </>
  );
};
