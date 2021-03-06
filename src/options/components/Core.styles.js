import { css } from 'styled-components';

import createStylesheet from 'utils/createStylesheet';

const styles = theme => css`
  /* Recent Activity Images */
  sj-scrolling-module[module-token='CLIENT_SIDE_RECENTS'] sj-card {
    width: 140px !important;
  }

  sj-scrolling-module[module-token='CLIENT_SIDE_RECENTS'] .details {
    margin-bottom: 20px !important;
  }
`;

export default createStylesheet(styles);
