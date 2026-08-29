import { Button, Result } from "antd";
import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Result
        status="404"
        title="Page not found"
        subTitle="The page you are looking for does not exist"
        extra={
          <Link href="/">
            <Button
              type="primary"
              style={{
                border: "3px solid #000",
                boxShadow: "3px 3px 0 #000",
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Go home
            </Button>
          </Link>
        }
      />
    </div>
  );
}
