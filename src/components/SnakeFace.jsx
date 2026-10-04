export default function SnakeFace({ silhouetteOnly = false }) {
  return (
    <svg className="snake-face-art" viewBox="0 0 100 100" aria-hidden="true">
      <path
        className="snake-head-shape"
        d="M6 49C8 27 24 13 43 12C50 10 57 10 64 13C84 16 98 31 102 49C106 68 98 85 83 94C68 102 31 101 16 93C2 85-4 67 6 49Z"
      />
      {!silhouetteOnly && (
        <>
          <path className="snake-head-highlight" d="M56 21Q75 20 85 33" />
          <g className="snake-eye">
            <path className="eye-white" d="M3 45H46Q44 68 24 68Q5 68 3 45Z" />
            <path className="eye-lid" d="M3 45H46" />
            <ellipse className="eye-pupil" cx="33" cy="57" rx="12" ry="9" />
            <circle className="eye-glint" cx="35" cy="54" r="2" />
          </g>
          <g className="snake-eye">
            <path className="eye-white" d="M57 45H100Q98 68 78 68Q59 68 57 45Z" />
            <path className="eye-lid" d="M57 45H100" />
            <ellipse className="eye-pupil" cx="86" cy="57" rx="12" ry="9" />
            <circle className="eye-glint" cx="88" cy="54" r="2" />
          </g>
          <g className="snake-crash-eyes">
            <path d="M14 40L36 62M36 40L14 62M68 40L90 62M90 40L68 62" />
          </g>
          <g className="snake-nostrils">
            <ellipse cx="48" cy="70" rx="2" ry="2.4" />
            <ellipse cx="60" cy="70" rx="2" ry="2.4" />
          </g>
          <ellipse className="snake-cheek" cx="17" cy="73" rx="7" ry="3.5" />
          <ellipse className="snake-cheek" cx="87" cy="73" rx="7" ry="3.5" />
          <path className="snake-smile" d="M44 79Q56 90 68 78" />
          <g className="snake-open-mouth">
            <path d="M43 75Q55 70 68 75C70 93 43 96 43 75Z" />
            <path className="mouth-inner-tongue" d="M49 88Q56 79 64 85Q60 93 49 88Z" />
          </g>
          <g className="snake-tongue">
            <path d="M55 79C76 69 89 89 104 78M104 78L117 69M104 78L116 89" />
          </g>
          <g className="snake-bow" transform="translate(7 22) rotate(-48) scale(1.9)">
            <path className="bow-loop" d="M-4 1C-17-13-31-24-40-17C-47-12-38-3-35 4C-42 12-40 19-32 21C-22 24-10 13-4 7Z" />
            <path className="bow-loop" d="M4 1C17-12 29-23 38-18C47-13 40-5 37 2C44 9 42 16 34 19C24 22 11 13 4 7Z" />
            <path className="bow-fold" d="M-24-5Q-15 0-6 4M24-4Q15 1 6 4" />
            <path className="bow-knot" d="M0-6C4-6 7-2 7 2C7 8 3 12 0 12C-4 12-7 8-7 2C-7-2-4-6 0-6Z" />
          </g>
        </>
      )}
    </svg>
  );
}
