import { Box, Divider, Slider, debounce, styled, useMediaQuery, useTheme } from "@mui/material";
import { DateTimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import fi from 'date-fns/locale/fi';
import { parse, addDays, addMonths, isAfter, isBefore, differenceInCalendarDays, differenceInCalendarMonths, format } from 'date-fns'
import { match, P } from "ts-pattern";
import { sortBy, castArray } from "lodash";
import { DATETIME_FORMAT } from "../../../shared/constants";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";

const TIME_FORMAT = "HH:mm";
const REFERENCE_DATE = new Date();
export const PULSSI_START_DATE_TIME = parse("26.10.2022 00:00", DATETIME_FORMAT, REFERENCE_DATE);
const DEFAULT_START_TIME = parse("00:00", TIME_FORMAT, REFERENCE_DATE);
const DEFAULT_END_TIME = parse("23:59", TIME_FORMAT, REFERENCE_DATE);
const DATE_FORMAT = "dd.MM.yyyy";
const SLIDER_MARK_FORMAT = "MM/yyyy";
const SLIDER_MARK_FORMAT_SHORT = "MM/yy";

type SliderProps = {
  values: Array<Date | null>,
   onChangeCommitted: (sliderStart: Date | null, sliderEnd: Date | null) => void
}

const StyledSlider = styled(Slider)(({theme}) => ({
  maxWidth: "40%",
  marginLeft: "30px",
  markLabelActive: {
    color: theme.palette.primary.main,
    fontWeight: 700,
  },
  thumb: {
    transition: 'none',
  },
  track: {
    transition: 'none',
  }
}));

const MAX_NUMBER_OF_MARKS = 11;

// Sliderin merkit päätellään kuukausien maksimimäärästä, siten että merkkejä maksimissaan 11.
// Jos kuukausien määrä alle 63, lasketaan merkit suoraan kuukausina. Muuten merkit lasketaan vuosina.
const resolveSliderMarks = (endDate: Date, isSmallDisplay: boolean = false) => {
  const nbrOfMonths = differenceInCalendarMonths(endDate, PULSSI_START_DATE_TIME);
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

  // Käytettäessä yhden tai kahden kk:n väliä, aloitetaan merkit 1.11.2022, muussa tapauksessa vuoden 2023 alusta
  const referenceDate = new Date();
  let markIteratorDate = stepLengthInMonths < 3 
    ? parse("1.11.2022", DATE_FORMAT, referenceDate) 
    : parse("1.1.2023", DATE_FORMAT, referenceDate);
  const marks = [{value: 0, label: ''}];
  while (isAfter(endDate, markIteratorDate)) {
    marks.push({ value: differenceInCalendarDays(markIteratorDate, PULSSI_START_DATE_TIME), label: format(markIteratorDate, isSmallDisplay ? SLIDER_MARK_FORMAT_SHORT : SLIDER_MARK_FORMAT)});  
    markIteratorDate = addMonths(markIteratorDate, stepLengthInMonths);
  }
  return marks;
};

const formatSliderLabel = (dayNumber: number) => format(addDays(PULSSI_START_DATE_TIME, dayNumber), DATE_FORMAT);

const HistorySearchSlider = (props: SliderProps) => {
  const currentDate = new Date();
  const values = [ props.values[0] ?? PULSSI_START_DATE_TIME, props.values[1] ?? currentDate];
  const maxValue = differenceInCalendarDays(currentDate, PULSSI_START_DATE_TIME);
  const sliderValues = values.map(dateVal => differenceInCalendarDays(dateVal, PULSSI_START_DATE_TIME));
  const valueToKey = (value: Array<number>) => `${value[0]},${value[1]}`;
  const handleSliderValueCommit = (
    _e: React.SyntheticEvent | Event,
    value: number | Array<number>
  ) => {
    const numVals = sortBy(Array.isArray(value) ? value : castArray(value));
    const dateValues = [ 
      numVals[0] !== 0 ? addDays(PULSSI_START_DATE_TIME, numVals[0]) : null, 
      numVals[1] !== maxValue ? addDays(PULSSI_START_DATE_TIME, numVals[1]) : null ];
    props.onChangeCommitted(dateValues[0], dateValues[1]);
  };

  const theme = useTheme();
  const isMediumDisplay = useMediaQuery(theme.breakpoints.down("md"));
  const isSmallDisplay = useMediaQuery(theme.breakpoints.down("sm"));
  
  return (
    <StyledSlider
      key={valueToKey(sliderValues)}
      min={0}
      max={maxValue}
      marks={isSmallDisplay ? undefined : resolveSliderMarks(currentDate, isMediumDisplay)}
      defaultValue={sliderValues}
      step={1}
      valueLabelDisplay="auto"
      valueLabelFormat={formatSliderLabel}
      onChangeCommitted={handleSliderValueCommit}
    />
  );
}

const combineDateTime = (date: Date, time: Date) => {
  const combined = new Date(date);
  combined.setHours(time.getHours());
  combined.setMinutes(time.getMinutes());
  return combined;
}

type SelectProps = {
  label: string,
  dateTimeValue: Date | null,
  defaultTimeValue: Date,
  minDateTime?: Date | undefined,
  maxDateTime?: Date | undefined,
  onDateChange: (date: Date | null) => void,
}

const isValidDate = (date: Date | null, params: SelectProps) => {
  if (date !== null) {
    if (isBefore(date, PULSSI_START_DATE_TIME) || isAfter(date, new Date())) {
      return false;
    }
    if (params.maxDateTime && isAfter(date, params.maxDateTime)) {
      return false;
    }
    if (params.minDateTime && isBefore(date, params.minDateTime)) {
      return false;
    }
  }
  return true;
}

const DateTimeSelect = (props: SelectProps) => {
  const { label, dateTimeValue, defaultTimeValue, onDateChange, minDateTime, maxDateTime } = props;
  const dateChanged = (date: Date | null) => {
    if (isValidDate(date, props)) {
      onDateChange(date);
    }
  }
  const setDateDebounced = useMemo(
    () => debounce(dateChanged, 300),
    [dateChanged]
  );

  const valueToKey = (dateVal : Date | null, postFix: string) => `${dateVal !== null ? dateVal.getTime.toString() : "null"}_${postFix}`;
  const dateBeforePulssiStartDate = (date: Date) => isBefore(date, PULSSI_START_DATE_TIME);
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fi}>
      <DateTimePicker
        key={valueToKey(dateTimeValue, "day")}
        label={label} 
        value={dateTimeValue}
        onChange={setDateDebounced}
        onAccept={onDateChange}
        sx={{ marginRight: '15px'}}
        slotProps={{ field: { clearable: true, onClear: () => onDateChange(null)}}}
        shouldDisableDate={dateBeforePulssiStartDate}
        minDateTime={minDateTime}
        maxDateTime={maxDateTime}
        disableFuture={true}
        timeSteps={{ hours: 1, minutes: 1}}
        referenceDate={defaultTimeValue}
      />
    </LocalizationProvider> 
  )
}
export type HistoryProps = {
  isOpen: boolean,
  start: Date | null,
  end: Date | null,
  onSearchRangeChange: (start: Date | null, end: Date | null) => void
}

export const HistorySearchSection = (props: HistoryProps) => {
  const { isOpen, start, end, onSearchRangeChange } = props;
  const { t } = useTranslation();

  const onStartDateChange = (date: Date | null) => onSearchRangeChange(date, end)
  const onEndDateChange = (date: Date | null) => onSearchRangeChange(start, date)
  
  const onSliderValueCommit = (sliderStart: Date | null, sliderEnd: Date | null) => {
    const newStart = sliderStart !== null ? combineDateTime(sliderStart, start || DEFAULT_START_TIME) : null;
    const newEnd = sliderEnd !== null ? combineDateTime(sliderEnd, end || DEFAULT_END_TIME) : null;
    onSearchRangeChange(newStart, newEnd);
  }

  return (
    <Box display={isOpen ? "flex": "none"} flexDirection="column" width="100%">
      <Box
        display="flex" 
        flexDirection="row" 
        flexWrap="wrap"
        justifyContent="flex-start" 
        alignItems="center" 
        marginLeft="1%"
        marginTop="30px"
        marginBottom="15px">
        <DateTimeSelect 
          label={t("alkuaika")} 
          dateTimeValue={start} 
          maxDateTime={end || undefined}
          defaultTimeValue={DEFAULT_START_TIME}
          onDateChange={onStartDateChange}
        />  
        <span style={{ marginLeft: '15px', marginRight: '15px', fontWeight: 600 }}>-</span>
        <DateTimeSelect 
          label={t("loppuaika")} 
          dateTimeValue={end}
          minDateTime={start || undefined}
          defaultTimeValue={DEFAULT_END_TIME}
          onDateChange={onEndDateChange}
        />  
        <HistorySearchSlider values={[start, end]} onChangeCommitted={onSliderValueCommit}/>
      </Box>
      <Divider />
    </Box>);
};