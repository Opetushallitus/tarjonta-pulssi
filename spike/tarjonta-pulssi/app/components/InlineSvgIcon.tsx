import React from 'react';

import type { SvgIconProps } from '@mui/material';
import { SvgIcon } from '@mui/material';
import SVG from 'react-inlinesvg';

type InlineSvgIconProps = {
  src: string;
} & SvgIconProps;

export const InlineSvgIcon = ({ src, ...rest }: InlineSvgIconProps) => {
  return (
    <SvgIcon {...rest}>
      <SVG fontSize="inherit" fill="currentColor" src={src} />
    </SvgIcon>
  );
};