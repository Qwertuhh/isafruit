type Config = {
  yolo: {
    data: {
      train: string;
      val: string;
      test: string;
      names: string[];
      nc: number;
    };
  };
};

export type { Config };
