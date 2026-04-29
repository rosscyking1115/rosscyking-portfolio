import { Download } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface CvDownloadProps {
  /** Path to the CV PDF served from /public. Defaults to "/cv.pdf". */
  href?: string;
  /** Filename suggested in the download dialog. */
  fileName?: string;
}

export function CvDownload({
  href = "/cv.pdf",
  fileName = "Cheng-Yuan-King-CV.pdf",
}: CvDownloadProps) {
  return (
    <Button asChild>
      <Link href={href} download={fileName}>
        <Download aria-hidden="true" />
        Download CV (PDF)
      </Link>
    </Button>
  );
}
