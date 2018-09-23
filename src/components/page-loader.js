import React from 'react'
import styled from 'styled-components'

const Loader = styled.div`
  pointer-events: none;
  user-select: none;
`;

const LoaderProgress = styled.div`
  background: linear-gradient(
    to right,
    orange,
    yellow,
    green,
    cyan,
    blue,
    violet
  );
  display: fixed;
  height: 4px;
  right: 100%;
  top: 100%;
  width: 100%;
  z-index: 900;
`

class PageLoader extends React.Component {
  render() {
    return (
      <Loader>
        <LoaderProgress></LoaderProgress>
      </Loader>
    )
  }
}

export default PageLoader
