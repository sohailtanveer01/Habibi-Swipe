import { G, Polygon, Svg } from "react-native-svg";

/**
 * Diamond Icon Component - Golden diamond shape for compliments
 * Matches the faceted diamond design with distinct geometric facets
 * @param {Object} props
 * @param {number} props.size - Size of the diamond (default: 24)
 * @param {string} props.color - Base color of the diamond (default: "#B8860B" - gold)
 * @param {Object} props.style - Additional styles
 */
export default function DiamondIcon({
  size = 24,
  color = "#B8860B",
  style
}) {
  // Color variations for depth (based on the original SVG colors)
  // Convert gold color to lighter/darker variations
  const lightGold = "#FFE182"; // Lightest facet
  const midGold = "#FFCD73";   // Medium facets
  const darkGold = "#FFAA64";  // Darker facets
  const darkestGold = "#FF8C5A"; // Darkest facet

  // Use provided color if it's white (for buttons), otherwise use gold variations
  const useColorVariations = color !== "#FFFFFF" && color !== "#fff" && color !== "white";
  const fillLight = useColorVariations ? lightGold : color;
  const fillMid = useColorVariations ? midGold : color;
  const fillDark = useColorVariations ? darkGold : color;
  const fillDarkest = useColorVariations ? darkestGold : color;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      style={style}
    >
      <G>
        {/* Right bottom facet - lightest */}
        <Polygon
          points="360.129,172.138 256,472.276 512,172.138"
          fill={fillLight}
        />

        {/* Left side facets - medium */}
        <Polygon
          points="105.931,39.724 0,172.138 151.871,172.138"
          fill={fillMid}
        />

        {/* Right side facets - medium */}
        <Polygon
          points="360.129,172.138 512,172.138 406.069,39.724"
          fill={fillMid}
        />

        {/* Center top facet - medium */}
        <Polygon
          points="360.129,172.138 256,39.724 151.871,172.138"
          fill={fillMid}
        />

        {/* Left top facet - darker */}
        <Polygon
          points="256,39.724 105.931,39.724 151.871,172.138"
          fill={fillDark}
        />

        {/* Right top facet - light */}
        <Polygon
          points="406.069,39.724 256,39.724 360.129,172.138"
          fill={fillLight}
        />

        {/* Center bottom facet - darker */}
        <Polygon
          points="151.871,172.138 256,472.276 360.129,172.138"
          fill={fillDark}
        />

        {/* Left bottom facet - darkest */}
        <Polygon
          points="0,172.138 256,472.276 151.871,172.138"
          fill={fillDarkest}
        />
      </G>
    </Svg>
  );
}

