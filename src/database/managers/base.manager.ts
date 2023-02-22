import { Model } from 'mongoose';

export class BaseManager<T> {
  constructor(
    private readonly _model: Model<T>,
    private readonly modelName: string,
  ) {}

  private async createIndex(name) {
    const ids = this._model.db.collection('IdContainer');
    const res = await ids.findOne({ _id: name });
    if (!res) {
      return ids.insertOne({
        _id: name,
        seq: 1,
      });
    }
  }

  protected async getNextSequence(count = 1) {
    await this.createIndex(this.modelName);
    const ids = this._model.db.collection('IdContainer');
    const ret = await ids.findOneAndUpdate(
      {
        _id: this.modelName,
      },
      {
        $inc: { seq: count },
      },
    );

    if (!ret.value) {
      throw new Error(`getNextSequence failed for: ${this.modelName}`);
    }

    return ret.value.seq - count + 1;
  }
}
