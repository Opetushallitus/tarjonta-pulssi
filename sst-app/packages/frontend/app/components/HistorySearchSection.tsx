import { Box, Divider, Slider, styled } from "@mui/material";
import { DatePicker, LocalizationProvider, TimeField, TimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import fi from 'date-fns/locale/fi';
import { parse, addDays, addMonths, isAfter, differenceInCalendarDays, differenceInCalendarMonths, format } from 'date-fns'
import { match, P } from "ts-pattern";
import { sortBy, castArray } from "lodash";
import { DATETIME_FORMAT } from "../../../shared/constants";
import { useTranslation } from "react-i18next";

const TIME_FORMAT = "HH:mm";
const REFERENCE_DATE = new Date();
export const PULSSI_START_DATE_TIME = parse("26.10.2022 00:00", DATETIME_FORMAT, REFERENCE_DATE);
const DEFAULT_START_TIME = parse("00:00", TIME_FORMAT, REFERENCE_DATE);
const DEFAULT_END_TIME = parse("23:59", TIME_FORMAT, REFERENCE_DATE);
const DATE_FORMAT = "dd.MM.yyyy";
const SLIDER_MARK_FORMAT = "MM/yyyy";

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
const resolveSliderMarks = (endDate: Date) => {
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
    marks.push({ value: differenceInCalendarDays(markIteratorDate, PULSSI_START_DATE_TIME), label: format(markIteratorDate, SLIDER_MARK_FORMAT)});  
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
  
  return (
    <StyledSlider
      key={valueToKey(sliderValues)}
      min={0}
      max={maxValue}
      marks={resolveSliderMarks(currentDate)}
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
  dateLabel: string,
  timeLabel: string,
  dateTimeValue: Date | null,
  defaultTimeValue: Date,
  onDateChange: (date: Date | null) => void,
}
const DateTimeSelect = (props: SelectProps) => {
  const { dateLabel, timeLabel, dateTimeValue, defaultTimeValue, onDateChange } = props;
  const timeChanged = (time: Date | null) => {
    const newTime = match([dateTimeValue, time ])
      .with([P.nullish, P._], () => null)
      .with([P.not(P.nullish), P.nullish], ([date, _]) => combineDateTime(date, defaultTimeValue)) // => 00:00 tai 23:59
      .otherwise(() => time);
    onDateChange(newTime);
  }

  const valueToKey = (dateVal : Date | null, postFix: string) => `${dateVal !== null ? dateVal.getTime.toString() : "null"}_${postFix}`;
  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fi}>
      <DatePicker
        key={valueToKey(dateTimeValue, "day")}
        label={dateLabel} 
        value={dateTimeValue}
        onChange={onDateChange}
        onAccept={onDateChange}
        sx={{ marginRight: '15px'}}
        slotProps={{ field: { clearable: true, onClear: () => onDateChange(null)}}}
      />
      <TimePicker
        label={timeLabel}
        value={dateTimeValue}
        onChange={timeChanged}
        onAccept={timeChanged}
        timeSteps={{ hours: 1, minutes: 1}}
        slotProps={{ field: { clearable: true, onClear: () => timeChanged(null)}}}
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
        justifyContent="flex-start" 
        alignItems="center" 
        marginLeft="1%"
        marginTop="30px"
        marginBottom="15px">
        <DateTimeSelect 
          dateLabel={t("alkupaiva")} 
          timeLabel={t("alkuaika")} 
          dateTimeValue={start} 
          defaultTimeValue={DEFAULT_START_TIME}
          onDateChange={onStartDateChange}
        />  
        <span style={{ marginLeft: '15px', marginRight: '15px', fontWeight: 600 }}>-</span>
        <DateTimeSelect 
          dateLabel={t("loppupaiva")} 
          timeLabel={t("loppuaika")} 
          dateTimeValue={end}
          defaultTimeValue={DEFAULT_END_TIME}
          onDateChange={onEndDateChange}
        />  
        <HistorySearchSlider values={[start, end]} onChangeCommitted={onSliderValueCommit}/>
      </Box>
      <Divider />
    </Box>);
};