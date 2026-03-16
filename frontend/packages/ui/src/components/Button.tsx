import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button: React.FC<ButtonProps> = ({ className = "", ...rest }) => {
  return (
    <button
      className={
        "px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors " +
        className
      }
      {...rest}
    />
  );
};

