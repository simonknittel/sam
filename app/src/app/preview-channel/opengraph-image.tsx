import { ImageResponse } from "next/og";

export const alt = "Sinister Corporated - Hoist the Black";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";
export const runtime = "edge";

export default async function og() {
  const fontData = await fetch(
    new URL("../../assets/Inter/static/Inter-Bold.ttf", import.meta.url),
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div tw="w-full h-full flex flex-col justify-between items-center uppercase font-bold p-24 bg-neutral-900">
        <p tw="text-9xl text-white m-0 w-full">Preview Channel</p>

        <div tw="flex flex-col w-full">
          <p tw="text-6xl text-[#BB2222] m-0 w-full">Sinister Inc</p>
          <p tw="text-3xl text-white m-0 w-full">Hoist the Black</p>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Inter",
          data: fontData,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}
