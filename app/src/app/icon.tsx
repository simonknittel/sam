import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function icon() {
  return new ImageResponse(
    (
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 128 128"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="0" y="0" width="128" height="128" rx="24" ry="24" fill="#000" />
        <g transform="translate(12.025 11.89) scale(0.27)" fill="#fff" fillRule="nonzero">
          <path d="M59.779,18.639L175.182,89.006L192.293,4.643L208.755,89.107L325.208,18.344L215.473,119.958L208.755,89.107L192.451,99.013L175.182,89.006L169.008,119.879L59.779,18.639Z" />
          <path d="M169.031,131.832L60.347,36.864L178.012,181.399L169.031,131.832Z" />
          <path d="M206.39,181.383L215.498,131.485L325.066,36.005L206.39,181.383Z" />
          <path d="M173.462,236.943L60.779,55.36L166.696,186.311L173.462,236.943Z" />
          <path d="M211.093,237.044L324.9,53.954L217.748,186.235L211.093,237.044Z" />
          <path d="M173.462,236.943L192.299,267.423L211.093,237.044L192.253,380.36L173.462,236.943Z" />
          <path d="M192.201,260.684L178.012,181.399L192.194,193.013L206.39,181.383L192.241,260.696L192.201,260.684Z" />
        </g>
      </svg>
    ),
    size,
  );
}
