export default function SnakeFace({ silhouetteOnly = false }) {
  return (
    <svg className="snake-face-art" viewBox="0 0 100 100" aria-hidden="true">
      <path
        className="snake-head-shape"
        d="M46 6C51 16 74 9 89 27C100 40 108 59 103 76C99 95 76 99 52 97C28 98 9 92 5 77C0 60 7 43 20 27C28 16 39 13 46 6Z"
      />
      {!silhouetteOnly && (
        <>
          <path className="snake-head-highlight" d="M54 21Q72 19 83 31" />
          <g className="snake-eye">
            <ellipse className="eye-white" cx="25" cy="48" rx="12" ry="14" />
            <ellipse className="eye-pupil" cx="27" cy="49" rx="5.5" ry="8" />
            <circle className="eye-glint" cx="25" cy="46" r="1.8" />
          </g>
          <g className="snake-eye">
            <ellipse className="eye-white" cx="79" cy="48" rx="12" ry="14" />
            <ellipse className="eye-pupil" cx="81" cy="49" rx="5.5" ry="8" />
            <circle className="eye-glint" cx="79" cy="46" r="1.8" />
          </g>
          <g className="snake-crash-eyes">
            <path d="M19 42L31 54M31 42L19 54M73 42L85 54M85 42L73 54" />
          </g>
          <g className="snake-nostrils">
            <ellipse cx="49" cy="63" rx="1.4" ry="1.9" />
            <ellipse cx="59" cy="63" rx="1.4" ry="1.9" />
          </g>
          <path className="snake-smile" d="M47 76Q55 83 63 76" />
          <g className="snake-open-mouth">
            <path d="M43 75Q55 70 68 75C70 93 43 96 43 75Z" />
            <path className="mouth-inner-tongue" d="M49 88Q56 79 64 85Q60 93 49 88Z" />
          </g>
          <g className="snake-tongue">
            <path d="M55 79C76 69 89 89 104 78M104 78L117 69M104 78L116 89" />
          </g>
          <g className="snake-bow" transform="translate(8 20) rotate(-62) scale(2)">
            <path className="bow-loop" d="M-3 0C-15-12-28-22-37-17L-31-4L-40 6C-27 15-11 12-3 6Z" />
            <path className="bow-loop" d="M3 0C15-12 29-21 38-15L31-2L39 9C26 16 12 12 3 6Z" />
            <path className="bow-fold" d="M-21-4L-6 3M21-2L6 3" />
            <rect className="bow-knot" x="-6" y="-4" width="12" height="15" rx="5" />
          </g>
        </>
      )}
    </svg>
  );
}
