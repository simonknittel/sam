"use client";

import { useState, type ChangeEventHandler } from "react";

export const AnalyticsCheckbox = () => {
  const [valueVercelAnalytics, setValueVercelAnalytics] = useState(
    localStorage.getItem("va-disable") === "true",
  );
  const [valuePlausible, setValuePlausible] = useState(
    localStorage.getItem("plausible_ignore") === "true",
  );

  const handleChangeVercelAnalytics: ChangeEventHandler<HTMLInputElement> = (
    e,
  ) => {
    if (e.target.checked) {
      localStorage.setItem("va-disable", "true");
    } else {
      localStorage.removeItem("va-disable");
    }

    setValueVercelAnalytics(e.target.checked);
  };

  const handleChangePlausible: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.checked) {
      localStorage.setItem("plausible_ignore", "true");
    } else {
      localStorage.removeItem("plausible_ignore");
    }

    setValuePlausible(e.target.checked);
  };

  return (
    <>
      <div className="flex gap-2 items-center">
        <input
          type="checkbox"
          id="va-disable"
          name="va-disable"
          onChange={handleChangeVercelAnalytics}
          defaultChecked={valueVercelAnalytics}
        />

        <label htmlFor="va-disable">Vercel Analytics</label>
      </div>

      <div className="flex gap-2 items-center">
        <input
          type="checkbox"
          id="plausible-ignore"
          name="plausible-ignore"
          onChange={handleChangePlausible}
          defaultChecked={valuePlausible}
        />

        <label htmlFor="plausible-ignore">Plausible</label>
      </div>
    </>
  );
};

export default AnalyticsCheckbox;
