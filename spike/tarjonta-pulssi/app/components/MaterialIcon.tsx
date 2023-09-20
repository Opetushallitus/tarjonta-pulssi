import type { SvgIconProps } from '@mui/material';

import { InlineSvgIcon } from './InlineSvgIcon';

export const MaterialIcon = ({
  icon,
  variant = 'filled',
  ...rest
}: {
  icon: MaterialIconName;
  variant?: 'filled' | 'outlined';
} & SvgIconProps) => (
  <InlineSvgIcon {...rest} src={`/konfo/icons/material/${variant}/${icon}.svg`} />
);

export const createMaterialIcon =
  (icon: MaterialIconName, variant: 'filled' | 'outlined' = 'filled') =>
  (props: SvgIconProps) => <MaterialIcon icon={icon} variant={variant} {...props} />;