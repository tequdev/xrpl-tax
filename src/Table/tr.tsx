import React, { ReactElement } from "react";
import { TableRowProps, Tr as ChakraTr } from "@chakra-ui/react";
import { Consumer } from "../utils";

interface ITrInnerProps extends TableRowProps {
  headers?: Record<number, any>;
  inHeader?: boolean;
}

const TrInner = (props: ITrInnerProps) => {
  const { headers, children, inHeader, ...rest } = props;

  if (headers && inHeader) {
    React.Children.map(props.children, (child, i) => {
      if (child) {
        headers[i] = (child as ReactElement).props.children;
      }
    });
  }

  const childProps = (idx: number) =>
    inHeader ? { key: idx } : { key: idx, columnKey: idx };

  return (
    <ChakraTr {...rest}>
      {children &&
        React.Children.map(
          children,
          (child, idx) =>
            React.isValidElement(child) &&
            React.cloneElement(child, childProps(idx))
        )}
    </ChakraTr>
  );
};

export interface ITrProps extends Omit<ITrInnerProps, "headers"> {}

export const Tr = (props: ITrProps) => (
  <Consumer>{(headers) => <TrInner {...props} headers={headers} />}</Consumer>
);
