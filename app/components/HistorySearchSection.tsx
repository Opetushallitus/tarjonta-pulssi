import { Box, Divider, Slider, styled, useMediaQuery, useTheme } from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  parse,
  set,
  addDays,
  addMonths,
  isAfter,
  isBefore,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  format,
} from "date-fns";
import fi from "date-fns/locale/fi";
import { sortBy, castArray } from "lodash";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { match, P } from "ts-pattern";

import { DATETIME_FORMAT_TZ } from "~/shared/constants";

const TIME_FORMAT = "HH:mm";
const REFERENCE_DATE = new Date();
const DEFAULT_START_TIME = parse("00:00", TIME_FORMAT, REFERENCE_DATE);
const DEFAULT_END_TIME = parse("23:59", TIME_FORMAT, REFERENCE_DATE);
const DATE_FORMAT = "dd.MM.yyyy";
const SLIDER_MARK_FORMAT = "MM/yyyy";
const SLIDER_MARK_FORMAT_SHORT = "MM/yy";

interface SliderProps {
  values: Array<Date | null>;
  onChangeCommitted: (sliderStart: Date | null, sliderEnd: Date | null) => void;
  minDate: Date;
}

const StyledSlider = styled(Slider)(({ theme }) => ({
  maxWidth: "40%",
  marginLeft: "30px",
  markLabelActive: {
    color: theme.palette.primary.main,
    fontWeight: 700,
  },
  thumb: {
    transition: "none",
  },
  track: {
    transition: "none",
  },
}));

const MAX_NUMBER_OF_MARKS = 11;

// Sliderin merkit päätellään kuukausien maksimimäärästä, siten että merkkejä maksimissaan 11.
// Jos kuukausien määrä alle 63, lasketaan merkit suoraan kuukausina. Muuten merkit lasketaan vuosina.
const resolveSliderMarks = (startDate: Date, endDate: Date, isSmallDisplay = false) => {
  const nbrOfMonths = differenceInCalendarMonths(endDate, startDate);
  const stepLengthInMonths = match(nbrOfMonths)
    .with(P.number.lt(11), () => 1)
    .with(P.number.lt(21), () => 2)
    .with(P.number.lt(33), () => 3)
    .with(P.number.lt(43), () => 4)
    .with(P.number.lt(53), () => 5)
    .with(P.number.lt(63), () => 6)
    .otherwise(() => {
      const monthsInMaxNbrOfSteps = 12 * MAX_NUMBER_OF_MARKS;
      return Math.ceil(nbrOfMonths / monthsInMaxNbrOfSteps) * 12;
    });

  // Aloitetaan merkit alkupäivästä laskien seuraavan kuukauden ensimmäisestä päivästä (tai alkupäivästä itsestään jos se on kuukauden 1. päivä)
  let markIteratorDate =
    startDate.getDate() === 1 ? startDate : set(addMonths(startDate, 1), { date: 1 });
  const marks = [{ value: 0, label: "" }];
  while (isAfter(endDate, markIteratorDate)) {
    marks.push({
      value: differenceInCalendarDays(markIteratorDate, startDate),
      label: format(
        markIteratorDate,
        isSmallDisplay ? SLIDER_MARK_FORMAT_SHORT : SLIDER_MARK_FORMAT
      ),
    });
    markIteratorDate = addMonths(markIteratorDate, stepLengthInMonths);
  }
  return marks;
};

const HistorySearchSlider = (props: SliderProps) => {
  const { values, minDate, onChangeCommitted } = props;
  const currentDate = new Date();
  const completeValues = [values[0] ?? minDate, values[1] ?? currentDate];
  const maxValue = differenceInCalendarDays(currentDate, minDate);
  const sliderValues = completeValues.map((dateVal) => differenceInCalendarDays(dateVal, minDate));
  const valueToKey = (value: Array<number>) => `${value[0]},${value[1]}`;
  const handleSliderValueCommit = (
    _e: React.SyntheticEvent | Event,
    value: number | Array<number>
  ) => {
    const numVals = sortBy(Array.isArray(value) ? value : castArray(value));
    const dateValues = [
      numVals[0] !== 0 ? addDays(minDate, numVals[0]) : null,
      numVals[1] !== maxValue ? addDays(minDate, numVals[1]) : null,
    ];
    onChangeCommitted(dateValues[0], dateValues[1]);
  };
  const formatSliderLabel = (dayNumber: number) => format(addDays(minDate, dayNumber), DATE_FORMAT);

  const theme = useTheme();
  const isMediumDisplay = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallDisplay = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <StyledSlider
      key={valueToKey(sliderValues)}
      min={0}
      max={maxValue}
      marks={isSmallDisplay ? undefined : resolveSliderMarks(minDate, currentDate, isMediumDisplay)}
      defaultValue={sliderValues}
      step={1}
      valueLabelDisplay="auto"
      valueLabelFormat={formatSliderLabel}
      onChangeCommitted={handleSliderValueCommit}
    />
  );
};

const combineDateTime = (date: Date, time: Date) => {
  const combined = new Date(date);
  combined.setHours(time.getHours());
  combined.setMinutes(time.getMinutes());
  return combined;
};

interface SelectProps {
  label: string;
  dateTimeValue: Date | null;
  referenceDateTime: Date;
  minDateTime: Date;
  maxDateTime?: Date;
  onDateChange: (date: Date | null) => void;
}

const DateTimeSelect = (props: SelectProps) => {
  const { label, dateTimeValue, referenceDateTime, onDateChange, minDateTime, maxDateTime } = props;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fi}>
      <DateTimePicker
        closeOnSelect={false}
        label={label}
        value={dateTimeValue}
        onAccept={onDateChange}
        sx={{ marginRight: "15px" }}
        slotProps={{ field: { readOnly: true } }}
        minDateTime={minDateTime}
        maxDateTime={maxDateTime}
        disableFuture={true}
        referenceDate={referenceDateTime}
        timeSteps={{ hours: 1, minutes: 1 }}
      />
    </LocalizationProvider>
  );
};
export interface HistoryProps {
  isOpen: boolean;
  minDateTime: string;
  start: Date | null;
  end: Date | null;
  onSearchRangeChange: (start: Date | null, end: Date | null) => void;
}

export const HistorySearchSection = (props: HistoryProps) => {
  const { isOpen, minDateTime, start, end, onSearchRangeChange } = props;
  const { t } = useTranslation();

  const onStartDateChange = (date: Date | null) => onSearchRangeChange(date, end);
  const onEndDateChange = (date: Date | null) => onSearchRangeChange(start, date);

  const onSliderValueCommit = (sliderStart: Date | null, sliderEnd: Date | null) => {
    const newStart =
      sliderStart !== null ? combineDateTime(sliderStart, start || DEFAULT_START_TIME) : null;
    const newEnd = sliderEnd !== null ? combineDateTime(sliderEnd, end || DEFAULT_END_TIME) : null;
    onSearchRangeChange(newStart, newEnd);
  };

  const [minDateTimeVal, setMinDateTimeVal] = useState<Date>(new Date());

  useEffect(() => {
    if (minDateTime !== "") {
      const refDate = new Date();
      const newDateval = parse(minDateTime, DATETIME_FORMAT_TZ, refDate);
      if (isBefore(newDateval, minDateTimeVal)) {
        setMinDateTimeVal(newDateval);
      }
    }
  }, [minDateTime, minDateTimeVal]);

  return (
    <Box display={isOpen ? "flex" : "none"} flexDirection="column" width="100%">
      <Box
        display="flex"
        flexDirection="row"
        flexWrap="wrap"
        justifyContent="flex-start"
        alignItems="center"
        marginLeft="1%"
        marginRight="2%"
        marginTop="30px"
        marginBottom="15px"
        rowGap="15px"
      >
        <DateTimeSelect
          label={t("alkuaika")}
          dateTimeValue={start}
          referenceDateTime={DEFAULT_START_TIME}
          minDateTime={minDateTimeVal}
          maxDateTime={end || undefined}
          onDateChange={onStartDateChange}
        />
        <span style={{ marginLeft: "15px", marginRight: "15px", fontWeight: 600 }}>-</span>
        <DateTimeSelect
          label={t("loppuaika")}
          dateTimeValue={end}
          referenceDateTime={DEFAULT_END_TIME}
          minDateTime={start || minDateTimeVal}
          onDateChange={onEndDateChange}
        />
        <HistorySearchSlider
          minDate={minDateTimeVal}
          values={[start, end]}
          onChangeCommitted={onSliderValueCommit}
        />
      </Box>
      <Divider />
    </Box>
  );
};
