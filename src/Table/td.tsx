import React from "react";
import { TableCellProps, Td as ChakraTd } from "@chakra-ui/react";
import { Consumer } from "../utils";

interface ITdInnerProps extends TableCellProps {
  columnKey?: number;
  narrowHeaders: Record<number, any>;
}

const TdInner = (props: ITdInnerProps) => {
  const { narrowHeaders, columnKey = 0, ...rest } = props;
  const classes = `${props.className || ""} pivoted`;

  return (
    <ChakraTd data-testid="td" {...rest} className={classes}>
      <div data-testid="td-before" className="tdBefore">
        {narrowHeaders[columnKey]}
      </div>
      {props.children ?? <div>&nbsp;</div>}
    </ChakraTd>
  );
};

export interface ITdProps extends Omit<ITdInnerProps, "narrowHeaders"> {}

export const Td = (props: ITdProps) => (
  <Consumer>
    {(headers) => <TdInner {...props} narrowHeaders={headers} />}
  </Consumer>
);
