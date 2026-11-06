import { Box, type BoxProps } from "./box";

export type StackProps = BoxProps & {
  direction?: "row" | "column";
};

export function Stack({ direction = "column", style, ...rest }: StackProps) {
  return <Box style={[{ flexDirection: direction }, style]} {...rest} />;
}

export type RowProps = Omit<StackProps, "direction">;

export function Row(props: RowProps) {
  return <Stack direction="row" {...props} />;
}

export function Column(props: RowProps) {
  return <Stack direction="column" {...props} />;
}
