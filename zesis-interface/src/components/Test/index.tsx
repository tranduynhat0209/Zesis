import { Box, Slider } from "@mui/material";
import { useState } from "react";

export default function TestComponent() {
  return (
    <Box
      sx={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
      }}
    >
      {/* <Slider
        aria-label="Test"
        sx={{
          '& input[type="range"]': {
            WebkitAppearance: "slider-vertical",
          },
        }}
        orientation="vertical"
        min={0}
        step={1}
        max={100}
        defaultValue={[0, 25, 50, 60, 70, 85, 90, 100]}
        valueLabelDisplay="auto"
        disableSwap
        componentsProps={{
          rail: {
            color: "red",
          },
        }}
      /> */}
      <WeightDistribution />
    </Box>
  );
}

const WeightDistribution = () => {
  const [values, setValues] = useState<Array<number>>([
    0, 10, 20, 30, 40, 50, 60, 100,
  ]);
  const minDis = [1, 1, 1, 1, 1, 1, 1, 1];
  const calNewValue = (
    inputArray: Array<number>,
    index: number,
    newValue: number
  ) => {
    if (index === 0) {
      return inputArray;
    }
    if (index === inputArray.length - 1) {
      return inputArray;
    }
    if (
      inputArray[index + 1] - newValue >= minDis[index] &&
      newValue - inputArray[index - 1] >= minDis[index - 1]
    ) {
      return inputArray
        .slice(0, index)
        .concat([newValue])
        .concat(inputArray.slice(index + 1));
    } else {
      return inputArray;
    }
  };
  const handleChangeValue = (
    index: number,
    newValue: number,
    activeThumb: number
  ) => {
    // console.log(calNewValue(index, newValue));
    setValues((prev) => {
      return calNewValue(prev, index, newValue);
    });
  };
  const colors = [
    "#FF0000", // Red
    "#00FF00", // Green
    "#0000FF", // Blue
    "#FFFF00", // Yellow
    "#FF00FF", // Magenta
    "#00FFFF", // Cyan
    "#800080", // Purple
    "#FFA500", // Orange
  ];
  return (
    <Box
      sx={{
        width: "10px",
        height: "500px",
        position: "relative",
        zIndex: 0,
      }}
    >
      {values.map((item, index) => {
        return (
          <>
            <Slider
              key={index}
              min={0}
              max={100}
              step={1}
              sx={{
                "& .MuiSlider-track": {
                  backgroundColor: colors[index],
                  zIndex: 7 - index,
                },
                "& .MuiSlider-thumb": {
                  zIndex: 10,
                  transform: "translate(10px,8px)",
                  display:
                    index === values.length - 1 || index === 0
                      ? "none"
                      : "initial",
                },

                display: "block",
                position: "absolute",
              }}
              value={item}
              orientation="vertical"
              onChange={(e, newValue, activeThumb) => {
                handleChangeValue(index, newValue as number, activeThumb);
              }}
              // track="inverted"
            />
            <Box
              sx={{
                position: "absolute",
                left: "-30px",
                top: `${100 - ((item + values[index - 1]) / 200) * 100}%`,
                display: index === 0 ? "none" : "flex",
                alignItems: "center",
                transform: "translateY(-20px)",
                backgroundColor: colors[index],
                px: 1,
                borderRadius: 1,
              }}
            >
              {values[index] - values[index - 1]}
            </Box>
          </>
        );
      })}
    </Box>
  );
};
