import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** 불러오기에 실패했을 때 그 자리에 보여 줄 내용 */
  fallback: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * 지연 로딩한 부분(예: 배포 직후 바뀐 파일)이 불러오기에 실패하면
 * 페이지 전체 오류 화면 대신 그 자리만 대체 문구로 바꿉니다.
 */
export class LazyBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
