type Config = {
  kaggle: {
    dataset: string;
    destination: string;
  };
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
